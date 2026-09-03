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

        public bool Delete(long id)
        {
            var entity = _db.Bookings.Find(id);
            if (entity == null) return false;

            _db.Bookings.Remove(entity);
            _db.SaveChanges();
            return true;
        }
    }
}
