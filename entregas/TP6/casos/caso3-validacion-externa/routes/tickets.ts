import { Router } from "express";
import { getTicketById } from "../repo/tickets";

export const router = Router();

router.get("/tickets/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "El id tiene que ser un entero positivo." });
  }

  const ticket = await getTicketById(id);
  if (!ticket) {
    return res.status(404).json({ error: "No existe un ticket con ese id." });
  }
  res.json(ticket);
});
