export function errorHandler(error, _req, res, _next) {
  if (error instanceof SyntaxError && error.status === 400)
    return res.status(400).json({ message: "El cuerpo debe contener JSON válido" });
  if (error.type === "entity.too.large")
    return res.status(413).json({ message: "La solicitud es demasiado grande" });
  if (error.code === "P2002")
    return res.status(409).json({ message: "Ya existe un registro con esos datos" });
  if (error.name === "PrismaClientInitializationError" || error.code === "P1001")
    return res.status(503).json({ message: "La base de datos no está disponible. Intenta nuevamente" });
  if (error.statusCode === 404) return res.status(404).json({ message: error.message });
  console.error("Error de API", { name: error.name, code: error.code });
  res.status(500).json({ message: "No se pudo completar la solicitud" });
}
