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
            if (!ModelState.IsValid)
            {
                return ValidationProblem(ModelState);
            }

            var created = _service.Create(dto);
            return Created(string.Empty, created);
        }
    }
}
