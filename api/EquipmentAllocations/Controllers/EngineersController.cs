using System.Collections.Generic;
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
            var created = _service.Create(dto);
            return CreatedAtAction(nameof(GetAll), new { id = created.EngineerId }, created);
        }
    }
}
