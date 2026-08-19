using System.ComponentModel.DataAnnotations;

namespace EquipmentAllocations.Dtos
{
    public class CreateBookingDto
    {
        [Required]
        [Range(1, int.MaxValue)]
        public int DeviceId { get; set; }

        [Required]
        [Range(1, int.MaxValue)]
        public int EngineerId { get; set; }

        [Required]
        public System.DateTime StartDate { get; set; }

        [Required]
        public System.DateTime EndDate { get; set; }

        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = string.Empty;

        public string? Payload { get; set; }
    }
}
