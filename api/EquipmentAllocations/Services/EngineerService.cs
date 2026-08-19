using EquipmentAllocations.Dtos;
using System.Collections.Generic;
using System.Linq;

namespace EquipmentAllocations.Services
{
    public class EngineerService : IEngineerService
    {
        private readonly List<EngineerDto> _store = new();
        private int _nextId = 1;
        private readonly object _lock = new();

        public IEnumerable<EngineerDto> GetAll()
        {
            lock (_lock)
            {
                return _store.Select(e => e).ToList();
            }
        }

        public EngineerDto Create(CreateEngineerDto dto)
        {
            var entity = new EngineerDto
            {
                EngineerId = GetNextId(),
                FullName = dto.FullName,
                Office = dto.Office,
                Email = dto.Email,
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
