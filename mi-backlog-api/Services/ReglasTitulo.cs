using MiBacklog.Api.Dtos;

namespace MiBacklog.Api.Services;

// Reglas de negocio de un título. Son las mismas que valida el frontend,
// pero acá son las que valen: el backend no confía en lo que llega del cliente.
public static class ReglasTitulo
{
    public static readonly string[] Tipos = ["Juego", "Serie", "Película"];
    public static readonly string[] Estados = ["Pendiente", "En curso", "Terminado", "Abandonado"];
    public static readonly string[] Generos = ["Acción", "Aventura", "RPG", "Comedia", "Drama", "Terror", "Ciencia ficción", "Deportes", "Otro"];
    public const int MaxTitulo = 100;
    public const int MaxComentario = 500;
    public const int MaxPlataforma = 50;

    // Devuelve los errores por campo. Si está vacío, los datos son válidos.
    public static Dictionary<string, string> Validar(TituloRequest datos)
    {
        var errores = new Dictionary<string, string>();
        var titulo = Limpiar(datos.Titulo);

        if (titulo.Length == 0)
            errores["titulo"] = "El nombre es obligatorio.";
        else if (titulo.Length > MaxTitulo)
            errores["titulo"] = $"El nombre puede tener hasta {MaxTitulo} caracteres.";

        if (!Tipos.Contains(datos.Tipo))
            errores["tipo"] = $"El tipo tiene que ser uno de: {string.Join(", ", Tipos)}.";

        if (datos.Estado is not null && !Estados.Contains(datos.Estado))
            errores["estado"] = $"El estado tiene que ser uno de: {string.Join(", ", Estados)}.";

        var genero = Limpiar(datos.Genero);
        if (genero.Length > 0 && !Generos.Contains(genero))
            errores["genero"] = "El género no está en la lista permitida.";

        if (Limpiar(datos.Plataforma).Length > MaxPlataforma)
            errores["plataforma"] = $"La plataforma puede tener hasta {MaxPlataforma} caracteres.";

        if (Limpiar(datos.Comentario).Length > MaxComentario)
            errores["comentario"] = $"El comentario puede tener hasta {MaxComentario} caracteres.";

        if (datos.Puntaje is decimal puntaje && (puntaje != decimal.Truncate(puntaje) || puntaje < 1 || puntaje > 10))
            errores["puntaje"] = "El puntaje tiene que ser un número entero del 1 al 10.";

        return errores;
    }

    public static string Limpiar(string? texto) => (texto ?? "").Trim();
}
