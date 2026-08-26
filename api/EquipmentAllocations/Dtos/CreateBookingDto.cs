using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace EquipmentAllocations.Dtos
{
    public class CreateBookingDto : IValidatableObject
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

        public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
        {
            if (EndDate <= StartDate)
            {
                yield return new ValidationResult(
                    "EndDate must be strictly after StartDate.",
                    new[] { nameof(EndDate) }
                );
            }
        }
    }
}
