namespace EquipmentAllocations.Dtos
{
    public class BookingDto
    {
        public long BookingId { get; set; }
        public int DeviceId { get; set; }
        public int EngineerId { get; set; }
        public System.DateTime StartDate { get; set; }
        public System.DateTime EndDate { get; set; }
        public string Status { get; set; } = string.Empty;
        public System.DateTime CreatedOn { get; set; }
        public string? Payload { get; set; }
    }
}
