using EquipmentAllocations.Dtos;
using System.Collections.Generic;
using System.Linq;

namespace EquipmentAllocations.Services
{
    public class DeviceService : IDeviceService
    {
        private readonly List<DeviceDto> _store = new();
        private int _nextId = 1;
        private readonly object _lock = new();

        public IEnumerable<DeviceDto> GetAll()
        {
            lock (_lock)
            {
                return _store.Select(d => d).ToList();
            }
        }

        public DeviceDto Create(CreateDeviceDto dto)
        {
            var entity = new DeviceDto
            {
                DeviceId = GetNextId(),
                AssetTag = dto.AssetTag,
                Kind = dto.Kind,
                Status = dto.Status,
                PurchasedOn = dto.PurchasedOn,
                Notes = dto.Notes
            };

            lock (_lock)
            {
                _store.Add(entity);
            }

            return entity;
        }

        private int GetNextId()
        {
            lock (_lock)
            {
                return _nextId++;
            }
        }
    }
}
