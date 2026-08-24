using EquipmentAllocations.Data;
using EquipmentAllocations.Dtos;
using EquipmentAllocations.Entities;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;

namespace EquipmentAllocations.Services
{
    public class EfBookingService : IBookingService
    {
        private readonly EquipmentAllocationsDbContext _db;

        public EfBookingService(EquipmentAllocationsDbContext db)
        {
            _db = db;
        }

        public IEnumerable<BookingDto> GetAll()
        {
            return _db.Bookings.AsNoTracking().Select(b => new BookingDto
            {
                BookingId = b.BookingId,
                DeviceId = b.DeviceId,
                EngineerId = b.EngineerId,
                StartDate = b.StartDate,
                EndDate = b.EndDate,
                Status = b.Status,
                CreatedOn = b.CreatedOn,
                Payload = b.Payload
            }).ToList();
        }

        public BookingDto Create(CreateBookingDto dto)
        {
            var entity = new Booking
            {
                DeviceId = dto.DeviceId,
                EngineerId = dto.EngineerId,
                StartDate = dto.StartDate,
                EndDate = dto.EndDate,
                Status = dto.Status,
                Payload = dto.Payload,
                CreatedOn = System.DateTime.UtcNow
            };

            _db.Bookings.Add(entity);
            _db.SaveChanges();

            return new BookingDto
            {
                BookingId = entity.BookingId,
                DeviceId = entity.DeviceId,
                EngineerId = entity.EngineerId,
                StartDate = entity.StartDate,
                EndDate = entity.EndDate,
                Status = entity.Status,
                CreatedOn = entity.CreatedOn,
                Payload = entity.Payload
            };
        }
    }
}
