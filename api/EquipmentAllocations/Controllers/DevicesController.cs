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

        [HttpPut("{id}")]
        public ActionResult<DeviceDto> Put(int id, [FromBody] UpdateDeviceDto dto)
        {
            try
            {
                var updated = _service.Update(id, dto);
                return Ok(updated);
            }
            catch (System.Collections.Generic.KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        public ActionResult Delete(int id)
        {
            var success = _service.Delete(id);
            if (!success) return NotFound();
            return NoContent();
        }
    }
}
