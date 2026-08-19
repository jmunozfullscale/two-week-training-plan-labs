using EquipmentAllocations.Dtos;
using System.Collections.Generic;

namespace EquipmentAllocations.Services
{
    public interface IEngineerService
    {
        IEnumerable<EngineerDto> GetAll();
        EngineerDto Create(CreateEngineerDto dto);
    }
}
