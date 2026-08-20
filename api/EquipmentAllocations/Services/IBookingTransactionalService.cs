using EquipmentAllocations.Dtos;
using System.Threading.Tasks;

namespace EquipmentAllocations.Services
{
    public interface IBookingTransactionalService
    {
        Task<BookingDto> IssueBookingAsync(CreateBookingDto dto, string? idempotencyKey);
    }
}
