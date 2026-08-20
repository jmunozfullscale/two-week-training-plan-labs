namespace EquipmentAllocations.Entities
{
    public class Device
    {
        public int DeviceId { get; set; }
        public string AssetTag { get; set; } = string.Empty;
        public string Kind { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public System.DateTime PurchasedOn { get; set; }
        public string? Notes { get; set; }
    }
}
