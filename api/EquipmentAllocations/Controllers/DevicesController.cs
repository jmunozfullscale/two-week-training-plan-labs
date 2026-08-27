using System.Collections.Generic;
using EquipmentAllocations.Dtos;
using EquipmentAllocations.Services;
using Microsoft.AspNetCore.Mvc;

namespace EquipmentAllocations.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DevicesController : ControllerBase
    {
        private readonly IDeviceService _service;

        public DevicesController(IDeviceService service)
        {
            _service = service;
        }

        [HttpGet]
        public ActionResult<IEnumerable<DeviceDto>> GetAll()
        {
            return Ok(_service.GetAll());
        }

        [HttpPost]
        public ActionResult<DeviceDto> Post([FromBody] CreateDeviceDto dto)
        {
            var created = _service.Create(dto);
            return CreatedAtAction(nameof(GetAll), new { id = created.DeviceId }, created);
        }
    }
}
