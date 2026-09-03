# Equipment Allocations - Architecture & Design Document

In compliance with Day 9 requirements and in preparation for Day 10 cohort walkthrough.

## 1. System Overview & Context

The **Equipment Allocations System** is a full-stack web application designed to track, manage, and book enterprise hardware assets (devices) to employees (engineers). The system addresses problems such as double-booking, data syncing, and robust error handling across layers.

The architecture _strictly_ adheres to a separated frontend-backend model:

- **Backend**: C# / .NET 10 Web API utilizing Entity Framework Core (EF Core) backed by SQL (and SQLite as a backup) for transactional data management.
- **Frontend**: React 19 (Vite) single-page application utilizing TypeScript in strict mode, Redux Toolkit for state management, and custom virtualization hooks.

---

## 2. Backend Architecture (C# / .NET 10)

The API is structured around clear separation of concerns, decoupling the HTTP layer from the data access logic using Domain Services and the Repository pattern (via EF Core _of course_).

### 2.1 Domain Entities (`/Entities`)

- **`Device`**: Represents IT assets. Properties include `DeviceId`, `AssetTag`, `Kind` (Laptop, Phone, etc.), `Status` (Available/Unavailable), and a `PurchasedOn`date.
- **`Engineer`**: Represents an employee. Properties include `EngineerId`, `FullName`, `Office`, and `Email`.
- **`Booking`**: Represents the "transactional" assignment of a `Device` to an `Engineer`. Contains important dates (`StartDate`, `EndDate`), audit data (`CreatedOn`, `Payload`), and status (`Confirmed`, `Completed`, `Cancelled`).

### 2.2 Transactional Services & Concurrency (`/Services`)

The main complexity of the backend lies in safely allocating equipment. This is handled by `EfBookingTransactionalService`.

- **EF Core Database Transactions**: To prevent race conditions, the service opens explicit database transactions (`BeginTransactionAsync`). If any validation fails (e.g. device is unavailable), the transaction is fully rolled back.
- **Idempotency Strategy**: The `POST /api/allocations/issue` endpoint expects an `Idempotency-Key` HTTP header.
  - The API _hashes_ the request payload against this key.
  - If a duplicate request arrives (due to UI retries, network delays, or other reasons like double-clicks), the API detects the conflict and safely rejects it with HTTP `409 Conflict` instead of creating duplicate rows in the database.

### 2.3 API Controllers (`/Controllers`)

- **`DevicesController` & `EngineersController`**: Standard RESTful endpoints (GET, POST, PUT, DELETE) handling CRUD for the core entities.
- **`BookingsController`**: A gateway to the transactional services and formats `ProblemDetails` standard responses for structured error handling.

### 2.4 Database & SQL Layer (EF Core / SQLite)

The application leverages **SQL** as its relational database, abstracted cleanly through **Entity Framework Core (EF Core)** to maintain robust, type-safe data access without writing raw SQL.

- **Relational Schema Design**:
  - The `Devices` and `Engineers` tables serve as primary lookup tables with integer Primary Keys (`DeviceId`, `EngineerId`).
  - The `Bookings` table acts as an associative/transactional table mapping an `EngineerId` to a `DeviceId`. Foreign Keys guarantee referential integrity, ensuring no booking can exist without a valid device and engineer.
- **Code-First Migrations**: The database schema is version-controlled in code using EF Core Migrations (found in `/Migrations`). This ensures the exact SQL tables, columns, and constraints can be reproduced automatically on any environment. I initially wanted to do database-first but quickly realized that code-first would be an easier approach.
- **SQL Execution & Parameterization**: EF Core translates the C# LINQ queries into optimized SQL. Most notably, it uses parameterized SQL queries by default for all inputs, which serves as a flawless, built-in defense against SQL Injection attacks.
- **Transactional Consistency**: As mentioned earlier, the `EfBookingTransactionalService` issues explicit `BEGIN TRANSACTION` and `COMMIT` SQL commands to guarantee atomic writes.

---

## 3. Frontend Architecture (React / TypeScript / Redux)

The frontend is engineered to handle thousands of records seamlessly while providing a type-safe developer experience.

### 3.1 State Management (Redux Toolkit)

The system makes use of **Redux Toolkit** to centralize application state, specifically for the `AllocationsGrid`.

- **Slices**: The `allocationsSlice` manages the raw dataset as well as UI interaction state (e.g., `filterText`).
- **Memoized Selectors**: `createSelector` is used extensively (`selectFilteredAllocations`). This prevents expensive React re-renders by ensuring the filtered array references remain strictly equal (`===`) unless the underlying `items` or `filterText` changes explicitly.

### 3.2 High-Performance Virtualization

To support massive datasets (e.g. 5,000+ bookings in view in one of the examples), both the read-only grids and the live editors (`AllocationsGrid`, `LiveAllocationEditor`) avoid standard DOM rendering limits.

- **`useVirtualScroll` Hook**: A custom implementation that calculates windowing logic.
- **Mechanism**: Given a container height and row height, it only renders the exact DOM nodes currently visible in the viewport (plus a small overscan buffer). Empty padding elements simulate the native scrollbar height, keeping memory footprint low and maintaining high-FPS scrolling regardless of dataset size.
- **Live Filtering**: Both components compute matches immediately (through Redux memoized selectors or React `useMemo` blocks) to integrate filtering with virtualization.

### 3.3 Data Fetching & API Hooks

Instead of raw `fetch` calls scattered in components, the app abstracts network logic into reusable custom hooks (`useDevices`, `useEngineers`, `useAllocations`).

- **Discriminated Union Results**: To prevent "silent" unhandled promise rejections, the mutation functions in these hooks do not `throw`. Instead, they return a structured `Result` union type (`{ success: true } | { success: false, error: string }`). This lets components handle failure paths without wrapping everything up in `try/catch` blocks.
- **AbortController**: Hooks support `AbortController` signaling to cancel pending requests if a component unmounts prematurely, preventing memory leaks and React state warnings.

---

## 4. Type Safety & Boundary Validation

By Day 9, the architecture was "fortified" with strict compilation rules and runtime boundary checks, eliminating "silent" runtime errors.

### 4.1 Strict TypeScript Compilation

- **Configuration**: `tsconfig.app.json` has both `"strict": true` and `"noUncheckedIndexedAccess": true` explicitly enabled.
- **Zero `any` Policy**: The codebase strictly forbids the use of the `any` type to bypass the type checker (using `unknown` and explicit type guards instead).
- **Impact**: The compiler aggressively warns against unsafe code. For example, it forces devs to explicitly handle scenarios where array lookups (`items[i]`) or `.find()` methods return `undefined`. This strictly prevents standard `Cannot read properties of undefined` UI crashes.

### 4.2 Boundary Validation via Zod

While TypeScript provides compile-time guarantees, it is actually blind to the actual shape of JSON returning from network requests at runtime.

- **Zod Schemas**: We defined strict schema validators in `src/schemas/allocation.ts` (`DeviceSchema`, `EngineerSchema`, `BookingSchema`).
- **The Sync Mechanism**: The TypeScript interfaces are directly inferred from the Zod schemas (`export type DeviceItem = z.infer<typeof DeviceSchema>`), ensuring a single source of truth.
- **How The Validation Flow Works**:
  1. The hook runs `fetch()` and receives untyped JSON.
  2. The data is intercepted via `z.array(Schema).parse(data)`.
  3. **Result**: If the C# backend payload structure shifts or corrupts unexpectedly, Zod instantly intercepts it and throws an explicit validation error. The corrupted data is blocked from entering the Redux store or React state, ensuring complete component stability.

---

## 5. Security & Error Handling

- **Consistent Error Schemas**: The backend utilizes ASP.NET Core `ProblemDetails` to return standard [RFC 7807 JSON error](https://www.rfc-editor.org/info/rfc7807/) JSON responses.
- **Graceful Degradation**: The frontend hooks safely catch these structured errors and map them to explicit `Result` return objects, ensuring the UI layer displays human-readable banners rather than crashing the application.
- **Input Sanitization**: Both the frontend (via React controlled inputs) and backend (via EF Core parameterized queries) inherently protect against XSS/SQL Injection attacks.
