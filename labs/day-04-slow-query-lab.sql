-- ============================================================================
-- Day 4 Slow-Query Lab — Juan Carlos Munoz, Training Plan 1
-- Seeded into the training repo on Day 1 as labs/slow-query-lab.sql
-- (delivered in the single Day-0 kickoff email with repo-seed-spec.md).
-- Self-administered, no EM send. Not a scored instrument — the scored
-- deliverable is labs/tuning-notes.md (manifest: sql-tuning-notes).
--
-- Setup: run the SCHEMA + SEED sections first (SQL Server Developer / LocalDB).
-- Then work Q1–Q4: capture the ACTUAL execution plan and a baseline timing,
-- diagnose, fix, re-measure. Notes go in labs/tuning-notes.md.
-- ============================================================================

-- ---------- SCHEMA ----------
IF OBJECT_ID('dbo.Bookings') IS NOT NULL DROP TABLE dbo.Bookings;
IF OBJECT_ID('dbo.Devices')  IS NOT NULL DROP TABLE dbo.Devices;
IF OBJECT_ID('dbo.Engineers') IS NOT NULL DROP TABLE dbo.Engineers;
GO

CREATE TABLE dbo.Engineers (
    EngineerId   INT IDENTITY(1,1) PRIMARY KEY,
    FullName     NVARCHAR(120) NOT NULL,
    Office       NVARCHAR(60)  NOT NULL,
    Email        NVARCHAR(200) NOT NULL,
    Notes        NVARCHAR(MAX) NULL          -- wide column, rarely needed
);

CREATE TABLE dbo.Devices (
    DeviceId     INT IDENTITY(1,1) PRIMARY KEY,
    AssetTag     NVARCHAR(20)  NOT NULL,
    Kind         NVARCHAR(40)  NOT NULL,     -- 'phone' | 'tablet' | 'vr'
    Status       NVARCHAR(20)  NOT NULL,     -- 'available' | 'onloan' | 'retired'
    PurchasedOn  DATE          NOT NULL,
    Notes        NVARCHAR(MAX) NULL
);

CREATE TABLE dbo.Bookings (
    BookingId    BIGINT IDENTITY(1,1) PRIMARY KEY,
    DeviceId     INT           NOT NULL REFERENCES dbo.Devices(DeviceId),
    EngineerId   INT           NOT NULL REFERENCES dbo.Engineers(EngineerId),
    StartDate    DATETIME2     NOT NULL,
    EndDate      DATETIME2     NOT NULL,
    Status       NVARCHAR(20)  NOT NULL,     -- 'reserved' | 'pickedup' | 'returned' | 'cancelled'
    CreatedOn    DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
    Payload      NVARCHAR(MAX) NULL          -- audit blob, wide
);
GO

CREATE OR ALTER FUNCTION dbo.IsOverdue(@EndDate DATETIME2, @Status NVARCHAR(20))
RETURNS BIT
AS BEGIN
    RETURN CASE WHEN @Status = 'pickedup' AND @EndDate < SYSUTCDATETIME() THEN 1 ELSE 0 END;
END
GO

-- ---------- SEED (generates enough rows to make the problems visible) ----------
SET NOCOUNT ON;
DECLARE @i INT = 0;
WHILE @i < 300 BEGIN
    INSERT INTO dbo.Engineers (FullName, Office, Email)
    VALUES (CONCAT('Engineer ', @i), CASE @i % 3 WHEN 0 THEN 'Cebu' WHEN 1 THEN 'Manila' ELSE 'Davao' END,
            CONCAT('eng', @i, '@example.com'));
    SET @i += 1;
END
SET @i = 0;
WHILE @i < 40 BEGIN
    INSERT INTO dbo.Devices (AssetTag, Kind, Status, PurchasedOn)
    VALUES (CONCAT('DEV-', 1000 + @i), CASE @i % 3 WHEN 0 THEN 'phone' WHEN 1 THEN 'tablet' ELSE 'vr' END,
            'available', DATEADD(DAY, -(@i * 37), '2024-01-01'));
    SET @i += 1;
END
-- ~120k historical bookings so plan shape matters
SET @i = 0;
WHILE @i < 120000 BEGIN
    INSERT INTO dbo.Bookings (DeviceId, EngineerId, StartDate, EndDate, Status)
    VALUES (1 + @i % 40, 1 + @i % 300,
            DATEADD(DAY, -(@i % 730), '2026-08-01'),
            DATEADD(DAY, -(@i % 730) + 3, '2026-08-01'),
            CASE WHEN @i % 11 = 0 THEN 'pickedup' ELSE 'returned' END);
    SET @i += 1;
END
GO

-- ---------- Q1 ----------
-- "All bookings for device 17 this quarter" — the office manager runs this constantly.
-- It gets slower as Bookings grows. Why? Prove it from the plan, then fix.
SELECT BookingId, EngineerId, StartDate, EndDate, Status
FROM dbo.Bookings
WHERE DeviceId = 17
  AND StartDate >= '2026-07-01' AND StartDate < '2026-10-01'
ORDER BY StartDate;

-- ---------- Q2 ----------
-- "All bookings that started in 2026."
-- There IS an index you could use here — check whether the plan does. Why not?
SELECT BookingId, DeviceId, EngineerId, StartDate, EndDate
FROM dbo.Bookings
WHERE YEAR(StartDate) = 2026;

-- ---------- Q3 ----------
-- The dashboard's default grid needs only these columns, but the query below is
-- what the legacy app actually sends. What's the extra cost? Prove it, then fix.
SELECT *
FROM dbo.Bookings
WHERE DeviceId = 5 AND Status = 'returned'
ORDER BY StartDate DESC;

-- ---------- Q4 ----------
-- "Everything currently overdue." This one crawls. Look at the plan carefully —
-- what is the UDF doing to it? Rewrite without the function.
SELECT BookingId, DeviceId, EngineerId, EndDate
FROM dbo.Bookings
WHERE dbo.IsOverdue(EndDate, Status) = 1;

-- ---------- FINAL SECTION (tuning-notes.md) ----------
-- After Q1–Q4: write the section "When is adding an index the WRONG fix?"
-- with at least 3 concrete cases, one of them from what you measured today.
