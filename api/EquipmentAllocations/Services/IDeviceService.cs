using EquipmentAllocations.Dtos;
using System.Collections.Generic;

namespace EquipmentAllocations.Services
{
    public interface IDeviceService
    {
        IEnumerable<DeviceDto> GetAll();
    }
}
