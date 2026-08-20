using EquipmentAllocations.Controllers;
using EquipmentAllocations.Dtos;
using EquipmentAllocations.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Xunit;

namespace EquipmentAllocations.Tests
{
    public class EngineerControllerTests
    {
        [Fact]
        public void Post_InvalidModel_ReturnsValidationProblem()
        {
            // Step 1 - Arrange
            var service = new EngineerService();
            var controller = new EngineersController(service);
            controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() };

            // Simulate model validation error (missing email)
            controller.ModelState.AddModelError("Email", "Required");

            var dto = new CreateEngineerDto
            {
                FullName = "Test Engineer",
                Office = "HQ",
                Email = string.Empty
            };

            // Step 2 - Act
            var actionResult = controller.Post(dto);

            // Step 3 - Assert
            var objectResult = Assert.IsType<ObjectResult>(actionResult.Result);
            Assert.IsType<ValidationProblemDetails>(objectResult.Value);
        }
    }
}
