using System.ComponentModel.DataAnnotations;

namespace EquipmentAllocations.Dtos
{
    public class UpdateEngineerDto
    {
        [Required]
        [MaxLength(120)]
        public string FullName { get; set; } = string.Empty;

        [Required]
        [MaxLength(60)]
        public string Office { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        [MaxLength(200)]
        public string Email { get; set; } = string.Empty;

        public string? Notes { get; set; }
    }
}
