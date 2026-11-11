using MiBacklog.Api.Repositories;
using MiBacklog.Api.Services;
using Microsoft.AspNetCore.Diagnostics;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

// Una sola instancia del repositorio: así el candado que protege el archivo es compartido.
builder.Services.AddSingleton<ITitulosRepository, JsonTitulosRepository>();
builder.Services.AddScoped<TitulosService>();
builder.Services.AddSingleton(TimeProvider.System);

// Permite que el frontend (servido en localhost:5173) llame a la API.
builder.Services.AddCors(opciones => opciones.AddDefaultPolicy(politica =>
    politica.WithOrigins("http://localhost:5173").AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();

// Cualquier error no previsto devuelve un 500 en JSON, sin detalles internos.
app.UseExceptionHandler(manejador => manejador.Run(async contexto =>
{
    var error = contexto.Features.Get<IExceptionHandlerFeature>()?.Error;
    contexto.Response.StatusCode = StatusCodes.Status500InternalServerError;
    var mensaje = error is DatosCorruptosException
        ? "No se pudieron leer los datos guardados. No se modificó nada."
        : "Ocurrió un error inesperado en el servidor.";
    await contexto.Response.WriteAsJsonAsync(new { error = mensaje });
}));

app.UseCors();
app.MapControllers();

app.Run();
