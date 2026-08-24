namespace EquipmentAllocations.Entities
{
    public class Engineer
    {
        public int EngineerId { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string Office { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? Notes { get; set; }
    }
}
