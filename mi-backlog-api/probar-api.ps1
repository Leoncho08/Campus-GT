# Prueba el alta de títulos contra la API corriendo (dotnet run).
# Uso: powershell -ExecutionPolicy Bypass -File probar-api.ps1
param([string]$Base = "http://localhost:5080/api/titulos")

$script:ok = 0; $script:fallas = 0

function Llamar($metodo, $url, $cuerpo) {
    $parametros = @{ Method = $metodo; Uri = $url; UseBasicParsing = $true; ContentType = "application/json; charset=utf-8" }
    if ($null -ne $cuerpo) { $parametros.Body = [Text.Encoding]::UTF8.GetBytes(($cuerpo | ConvertTo-Json -Compress)) }
    try {
        $r = Invoke-WebRequest @parametros
        return @{ Status = [int]$r.StatusCode; Body = [Text.Encoding]::UTF8.GetString($r.RawContentStream.ToArray()); Location = $r.Headers["Location"] }
    } catch [System.Net.WebException] {
        $resp = $_.Exception.Response
        $lector = New-Object IO.StreamReader($resp.GetResponseStream(), [Text.Encoding]::UTF8)
        return @{ Status = [int]$resp.StatusCode; Body = $lector.ReadToEnd() }
    }
}

function Probar($nombre, $esperado, $respuesta, [scriptblock]$extra) {
    $pasa = $respuesta.Status -eq $esperado
    if ($pasa -and $extra) { $pasa = & $extra $respuesta }
    if ($pasa) { $script:ok++; $marca = "OK  " } else { $script:fallas++; $marca = "FALLA" }
    Write-Output "[$marca] $nombre -> HTTP $($respuesta.Status) (esperado $esperado)"
    Write-Output "        $($respuesta.Body)"
}

Write-Output "=== Alta de títulos: POST $Base ===`n"

# Caso correcto: todos los campos
$r = Llamar POST $Base @{ titulo = "  Hollow Knight  "; tipo = "Juego"; estado = "Terminado"; plataforma = "Steam"; genero = "Aventura"; puntaje = 9; comentario = "Excelente" }
Probar "Crear un título válido" 201 $r { param($x) $j = $x.Body | ConvertFrom-Json; $j.titulo -eq "Hollow Knight" -and $j.id -and -not $j.favorito }
$creado = $r.Body | ConvertFrom-Json

# Caso correcto: solo los campos obligatorios -> el estado queda en Pendiente
$r = Llamar POST $Base @{ titulo = "Película mínima"; tipo = "Película" }
Probar "Crear con lo mínimo (estado por defecto Pendiente)" 201 $r { param($x) ($x.Body | ConvertFrom-Json).estado -eq "Pendiente" }

# El cliente no puede elegir id, fechas ni favorito
$r = Llamar POST $Base @{ titulo = "Intento de trampa"; tipo = "Serie"; id = "mi-id"; favorito = $true; fechaCreacion = "2000-01-01T00:00:00Z" }
Probar "Ignora id, favorito y fecha enviados por el cliente" 201 $r { param($x) $j = $x.Body | ConvertFrom-Json; $j.id -ne "mi-id" -and -not $j.favorito -and ([datetime]$j.fechaCreacion).Year -gt 2000 }

# Datos inválidos
$r = Llamar POST $Base @{ tipo = "Juego" }
Probar "Sin nombre" 400 $r { param($x) ($x.Body | ConvertFrom-Json).errores.titulo }

$r = Llamar POST $Base @{ titulo = "   "; tipo = "Juego" }
Probar "Nombre con solo espacios" 400 $r { param($x) ($x.Body | ConvertFrom-Json).errores.titulo }

$r = Llamar POST $Base @{ titulo = "Algo"; tipo = "Libro"; estado = "Visto" }
Probar "Tipo y estado que no existen (dos errores juntos)" 400 $r { param($x) $e = ($x.Body | ConvertFrom-Json).errores; $e.tipo -and $e.estado }

$r = Llamar POST $Base @{ titulo = "Algo"; tipo = "Juego"; puntaje = 7.5 }
Probar "Puntaje decimal" 400 $r { param($x) ($x.Body | ConvertFrom-Json).errores.puntaje }

# Casos límite
$r = Llamar POST $Base @{ titulo = "Algo"; tipo = "Juego"; puntaje = 0 }
Probar "Puntaje 0 (debajo del mínimo)" 400 $r { param($x) ($x.Body | ConvertFrom-Json).errores.puntaje }

$r = Llamar POST $Base @{ titulo = "Algo"; tipo = "Juego"; puntaje = 11 }
Probar "Puntaje 11 (arriba del máximo)" 400 $r { param($x) ($x.Body | ConvertFrom-Json).errores.puntaje }

$r = Llamar POST $Base @{ titulo = "Puntaje diez"; tipo = "Juego"; puntaje = 10 }
Probar "Puntaje 10 (máximo permitido)" 201 $r

$r = Llamar POST $Base @{ titulo = ("x" * 100); tipo = "Juego" }
Probar "Nombre de 100 caracteres (justo el máximo)" 201 $r

$r = Llamar POST $Base @{ titulo = ("x" * 101); tipo = "Juego" }
Probar "Nombre de 101 caracteres" 400 $r { param($x) ($x.Body | ConvertFrom-Json).errores.titulo }

Write-Output "`n=== Consultas ===`n"

$r = Llamar GET "$Base/$($creado.id)" $null
Probar "Obtener por id el título creado" 200 $r { param($x) ($x.Body | ConvertFrom-Json).titulo -eq "Hollow Knight" }

$r = Llamar GET "$Base/no-existe" $null
Probar "Obtener un id que no existe" 404 $r

$r = Llamar GET $Base $null
$lista = ConvertFrom-Json $r.Body
$cantidad = $lista.Count
Probar "Listar: hay 5 títulos (solo los válidos se guardaron)" 200 @{ Status = $r.Status; Body = "$cantidad títulos" } { param($x) $cantidad -eq 5 }

Write-Output "`nResultado: $script:ok pasaron, $script:fallas fallaron"
