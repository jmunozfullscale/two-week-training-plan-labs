using EquipmentAllocations.Dtos;
using EquipmentAllocations.Services;
using Microsoft.AspNetCore.Mvc;

namespace EquipmentAllocations.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class EngineersController : ControllerBase
    {
        private readonly IEngineerService _service;

        public EngineersController(IEngineerService service)
        {
            _service = service;
        }

        [HttpGet]
        public ActionResult<IEnumerable<EngineerDto>> GetAll()
        {
            return Ok(_service.GetAll());
        }

        [HttpPost]
        public ActionResult<EngineerDto> Post([FromBody] CreateEngineerDto dto)
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
