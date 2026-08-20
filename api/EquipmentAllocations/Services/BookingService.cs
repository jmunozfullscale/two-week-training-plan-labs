using EquipmentAllocations.Dtos;
using System.Collections.Generic;
using System.Linq;

namespace EquipmentAllocations.Services
{
    public class BookingService : IBookingService
    {
        private readonly List<BookingDto> _store = new();
        private long _nextId = 1;
        private readonly object _lock = new();

        public IEnumerable<BookingDto> GetAll()
        {
            lock (_lock)
            {
                return _store.Select(b => b).ToList();
            }
        }

        public BookingDto Create(CreateBookingDto dto)
        {
            var entity = new BookingDto
            {
                BookingId = GetNextId(),
                DeviceId = dto.DeviceId,
                EngineerId = dto.EngineerId,
                StartDate = dto.StartDate,
                EndDate = dto.EndDate,
                Status = dto.Status,
                CreatedOn = System.DateTime.UtcNow,
                Payload = dto.Payload
            };

            lock (_lock)
            {
                _store.Add(entity);
            }

            return entity;
        }

        private long GetNextId()
        {
            lock (_lock)
            {
                return _nextId++;
            }
        }
    }
}
