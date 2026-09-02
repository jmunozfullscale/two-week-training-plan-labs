using System.ComponentModel.DataAnnotations;

namespace EquipmentAllocations.Dtos
{
    public class UpdateDeviceDto
    {
        [Required]
        [MaxLength(20)]
        public string AssetTag { get; set; } = string.Empty;

        [Required]
        [MaxLength(40)]
        public string Kind { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = string.Empty;

        [Required]
        public System.DateTime PurchasedOn { get; set; }

        public string? Notes { get; set; }
    }
}
