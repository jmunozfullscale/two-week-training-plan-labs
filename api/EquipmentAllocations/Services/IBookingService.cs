using EquipmentAllocations.Dtos;
using System.Collections.Generic;

namespace EquipmentAllocations.Services
{
    public interface IBookingService
    {
        IEnumerable<BookingDto> GetAll();
        bool Delete(long id);
    }
}
