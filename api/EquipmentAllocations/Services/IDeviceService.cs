using EquipmentAllocations.Dtos;
using System.Collections.Generic;

namespace EquipmentAllocations.Services
{
    public interface IDeviceService
    {
        IEnumerable<DeviceDto> GetAll();
        DeviceDto Create(CreateDeviceDto dto);
        DeviceDto Update(int id, UpdateDeviceDto dto);
        bool Delete(int id);
    }
}
