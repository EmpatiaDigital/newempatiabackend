// controllers/cuotasController.js
const Cuota = require("../models/cuotaModel");
const ParametrosCuota = require("../models/parametrosCuotaModel");
const Socio = require("../models/Socio");
const nodemailer = require("nodemailer");

// ── Transporter ───────────────────────────────────────────────────────────────

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: "empatiadigital2025@gmail.com",
    pass: "nbnh gere gtos vors",
  },
});

// ── Helper: obtener o crear parámetros globales ───────────────────────────────

async function obtenerParametros() {
  let p = await ParametrosCuota.findOne();
  if (!p) {
    p = await ParametrosCuota.create({
      montoBase: 5000,
      diaCierre: 10,
      moneda: "ARS",
    });
  }
  return p;
}

// ── Helper: parsear fecha sin bug de timezone ─────────────────────────────────
// new Date("2026-05-01") en algunos entornos se interpreta como UTC midnight,
// lo que en UTC-3 da 30/04. Usamos los componentes directamente para evitarlo.

function parsearFechaSegura(fechaStr) {
  if (!fechaStr) return new Date();
  // Si viene como ISO completo (con T y Z) usamos UTC directamente
  if (typeof fechaStr === "string" && fechaStr.includes("T")) {
    const d = new Date(fechaStr);
    // Extraemos año/mes/día en UTC para no perder un día por timezone
    return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  }
  // Si viene como "YYYY-MM-DD" parseamos manualmente
  const partes = String(fechaStr).slice(0, 10).split("-");
  if (partes.length === 3) {
    return new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
  }
  const d = new Date(fechaStr);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

// ── Helper: ¿un mes/año es ANTERIOR al mes de inscripción? ───────────────────


function mesAnteriorAInscripcion(vencMes, vencAnio, altaMes, altaAnio) {
  // altaMes y vencMes son 1-based (1=enero, 12=diciembre)
  if (vencAnio < altaAnio) return true;
  if (vencAnio === altaAnio && vencMes < altaMes) return true;
  return false;
}

// ── Helper: armar y enviar correo de recordatorio ─────────────────────────────

async function enviarCorreoRecordatorio({
  nombre,
  apellido,
  correo,
  numeroSocio,
  cuotasVencidas,
  montoBase,
  moneda,
}) {
  const MESES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ];

  const formatMonto = (n) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: moneda,
      maximumFractionDigits: 0,
    }).format(n);

  const filasTabla = cuotasVencidas
    .map(
      ({ mes, anio }) => `
        <tr>
          <td style="padding:11px 16px;border-bottom:1px solid #f1f5f9;
                      font-size:14px;color:#1e293b;">
            ${MESES[mes - 1]} ${anio}
          </td>
          <td style="padding:11px 16px;border-bottom:1px solid #f1f5f9;
                      font-size:14px;">
            <span style="display:inline-block;padding:3px 10px;
                          border-radius:999px;background:#fee2e2;
                          color:#dc2626;font-size:12px;font-weight:700;">
              Vencida
            </span>
          </td>
          <td style="padding:11px 16px;border-bottom:1px solid #f1f5f9;
                      font-size:14px;color:#1e293b;font-weight:600;
                      text-align:right;">
            ${formatMonto(montoBase)}
          </td>
        </tr>`
    )
    .join("");

  const totalDeuda = formatMonto(montoBase * cuotasVencidas.length);

  const fechaHoy = new Date().toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const cantLabel =
    cuotasVencidas.length > 1
      ? `${cuotasVencidas.length} cuotas vencidas`
      : "1 cuota vencida";

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Recordatorio de cuotas — Empatía Digital</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Inter',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0"
    style="background:#f1f5f9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="580" cellpadding="0" cellspacing="0"
          style="max-width:580px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#10b981 0%,#7c3aed 100%);
                        border-radius:16px 16px 0 0;padding:30px 36px 28px;">
              <p style="margin:0 0 6px;font-size:11px;font-weight:700;
                         letter-spacing:.14em;text-transform:uppercase;
                         color:rgba(255,255,255,.70);">
                Empatía Digital
              </p>
              <h1 style="margin:0;font-size:22px;font-weight:800;
                          color:#ffffff;line-height:1.25;">
                Recordatorio de cuota${cuotasVencidas.length > 1 ? "s" : ""} pendiente${cuotasVencidas.length > 1 ? "s" : ""}
              </h1>
              <p style="margin:8px 0 0;font-size:13px;color:rgba(255,255,255,.80);">
                ${fechaHoy}
              </p>
            </td>
          </tr>

          <!-- Cuerpo -->
          <tr>
            <td style="background:#ffffff;padding:30px 36px;">
              <p style="margin:0 0 8px;font-size:15px;color:#1e293b;line-height:1.65;">
                Hola <strong>${nombre} ${apellido}</strong>,
              </p>
              <p style="margin:0 0 24px;font-size:15px;color:#1e293b;line-height:1.65;">
                Te escribimos para informarte que, a la fecha de hoy, registrás
                <strong style="color:#dc2626;">${cantLabel}</strong>
                como socio N°&nbsp;<strong>${String(numeroSocio).padStart(4, "0")}</strong>.
                Te pedimos que regularices tu situación a la brevedad posible.
              </p>

              <!-- Tabla cuotas -->
              <table width="100%" cellpadding="0" cellspacing="0"
                style="border:1.5px solid #e2e8f0;border-radius:10px;
                        overflow:hidden;margin-bottom:24px;">
                <thead>
                  <tr style="background:#f8fafc;">
                    <th style="padding:11px 16px;text-align:left;font-size:11px;
                                font-weight:700;letter-spacing:.08em;
                                text-transform:uppercase;color:#7c3aed;
                                border-bottom:1px solid #e2e8f0;">Período</th>
                    <th style="padding:11px 16px;text-align:left;font-size:11px;
                                font-weight:700;letter-spacing:.08em;
                                text-transform:uppercase;color:#7c3aed;
                                border-bottom:1px solid #e2e8f0;">Estado</th>
                    <th style="padding:11px 16px;text-align:right;font-size:11px;
                                font-weight:700;letter-spacing:.08em;
                                text-transform:uppercase;color:#7c3aed;
                                border-bottom:1px solid #e2e8f0;">Monto</th>
                  </tr>
                </thead>
                <tbody>${filasTabla}</tbody>
                <tfoot>
                  <tr style="background:#fef2f2;">
                    <td colspan="2"
                      style="padding:13px 16px;font-size:13px;
                              font-weight:700;color:#7f1d1d;">
                      Total adeudado
                    </td>
                    <td style="padding:13px 16px;font-size:16px;
                                font-weight:800;color:#dc2626;text-align:right;">
                      ${totalDeuda}
                    </td>
                  </tr>
                </tfoot>
              </table>

              <p style="margin:0 0 28px;font-size:14px;color:#64748b;line-height:1.65;">
                Si ya realizaste el pago, por favor ignorá este mensaje.
                De lo contrario, comunicate con nosotros por cualquiera de los
                medios habituales para coordinar la regularización.
              </p>

              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:linear-gradient(135deg,#10b981 0%,#7c3aed 100%);
                              border-radius:8px;">
                    <a href="mailto:empatiadigital2025@gmail.com"
                      style="display:inline-block;padding:13px 30px;
                              font-size:14px;font-weight:700;
                              color:#ffffff;text-decoration:none;
                              letter-spacing:.02em;">
                      Contactar a la asociación →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;border-top:1.5px solid #e2e8f0;
                        border-radius:0 0 16px 16px;padding:18px 36px;">
              <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.65;">
                Este es un mensaje automático enviado por el sistema de
                <strong>Empatía Digital</strong>.<br>
                Por favor no respondas directamente a este correo.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const info = await transporter.sendMail({
    from: '"Empatía Digital" <empatiadigital2025@gmail.com>',
    to: correo,
    subject: `Recordatorio: tenés ${cantLabel} — Empatía Digital`,
    html,
  });

  return info;
}

// ── GET /api/cuotas/parametros ────────────────────────────────────────────────

exports.getParametros = async (req, res) => {
  try {
    const p = await obtenerParametros();
    res.json({ montoBase: p.montoBase, diaCierre: p.diaCierre, moneda: p.moneda });
  } catch (err) {
    console.error("[cuotas] getParametros:", err);
    res.status(500).json({ error: "Error al obtener parámetros" });
  }
};

// ── PUT /api/cuotas/parametros ────────────────────────────────────────────────

exports.putParametros = async (req, res) => {
  try {
    const { montoBase, diaCierre, moneda } = req.body;
    if (!montoBase || montoBase <= 0)
      return res.status(400).json({ error: "Monto base inválido" });
    if (!diaCierre || diaCierre < 1 || diaCierre > 28)
      return res.status(400).json({ error: "Día de cierre debe estar entre 1 y 28" });
    if (!["ARS", "USD"].includes(moneda))
      return res.status(400).json({ error: "Moneda inválida" });

    let p = await ParametrosCuota.findOne();
    if (p) {
      p.montoBase = montoBase;
      p.diaCierre = diaCierre;
      p.moneda = moneda;
      await p.save();
    } else {
      p = await ParametrosCuota.create({ montoBase, diaCierre, moneda });
    }
    res.json({ montoBase: p.montoBase, diaCierre: p.diaCierre, moneda: p.moneda });
  } catch (err) {
    console.error("[cuotas] putParametros:", err);
    res.status(500).json({ error: "Error al guardar parámetros" });
  }
};

// ── GET /api/cuotas/socios ────────────────────────────────────────────────────

exports.getSociosConCuotas = async (req, res) => {
  try {
    const socios = await Socio.find()
      .select("nombre apellido correo numeroSocio fechaInscripcion userId")
      .lean();

    if (!socios.length) return res.json([]);

    const hoy = new Date();
    const inicio = new Date(hoy.getFullYear(), hoy.getMonth() - 3, 1);
    const ids = socios.map((s) => s._id);

    const cuotas = await Cuota.find({
      socioId: { $in: ids },
      $or: [
        { anio: { $gt: inicio.getFullYear() } },
        { anio: inicio.getFullYear(), mes: { $gte: inicio.getMonth() + 1 } },
      ],
    }).lean();

    const cuotasBySocio = {};
    cuotas.forEach((c) => {
      const key = c.socioId.toString();
      if (!cuotasBySocio[key]) cuotasBySocio[key] = [];
      cuotasBySocio[key].push({
        _id: c._id,
        mes: c.mes,
        anio: c.anio,
        pagada: c.pagada,
        monto: c.monto,
        fechaPago: c.fechaPago,
      });
    });

    const resultado = socios.map((s) => ({
      _id: s._id,
      nombre: s.nombre,
      apellido: s.apellido,
      correo: s.correo,
      numeroSocio: s.numeroSocio,
      // ✅ Devolvemos solo YYYY-MM-DD para que el frontend parsee sin timezone
      fechaInscripcion: s.fechaInscripcion
        ? new Date(s.fechaInscripcion).toISOString().slice(0, 10)
        : "2024-01-01",
      cuotas: cuotasBySocio[s._id.toString()] || [],
    }));

    res.json(resultado);
  } catch (err) {
    console.error("[cuotas] getSociosConCuotas:", err);
    res.status(500).json({ error: "Error al obtener socios con cuotas" });
  }
};

// ── GET /api/cuotas/socio-detalle/:id ─────────────────────────────────────────

exports.getSocioDetalle = async (req, res) => {
  try {
    const socio = await Socio.findById(req.params.id)
      .select("nombre apellido correo telefono provincia ciudad numeroSocio avatar active freezeUntil fechaInscripcion")
      .lean();

    if (!socio) return res.status(404).json({ error: "Socio no encontrado" });

    const cuotas = await Cuota.find({ socioId: req.params.id }).lean();

    res.json({
      _id: socio._id,
      nombre: socio.nombre,
      apellido: socio.apellido,
      correo: socio.correo,
      telefono: socio.telefono ?? "",
      provincia: socio.provincia ?? "",
      ciudad: socio.ciudad ?? "",
      numeroSocio: socio.numeroSocio,
      avatar: socio.avatar ?? null,
      active: socio.active ?? true,
      freezeUntil: socio.freezeUntil ?? null,
      // ✅ Solo YYYY-MM-DD para evitar timezone drift en el frontend
      fechaInscripcion: socio.fechaInscripcion
        ? new Date(socio.fechaInscripcion).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10),
      cuotas: cuotas.map((c) => ({
        _id: c._id,
        mes: c.mes,
        anio: c.anio,
        pagada: c.pagada,
        monto: c.monto ?? null,
        fechaPago: c.fechaPago ?? null,
      })),
    });
  } catch (err) {
    console.error("[cuotas] getSocioDetalle:", err);
    res.status(500).json({ error: "Error al obtener detalle del socio" });
  }
};

// ── GET /api/cuotas/socio/:id ─────────────────────────────────────────────────

exports.getCuotasBySocio = async (req, res) => {
  try {
    const cuotas = await Cuota.find({ socioId: req.params.id }).lean();
    res.json(cuotas);
  } catch (err) {
    console.error("[cuotas] getCuotasBySocio:", err);
    res.status(500).json({ error: "Error al obtener cuotas del socio" });
  }
};

// ── POST /api/cuotas ──────────────────────────────────────────────────────────

exports.upsertCuota = async (req, res) => {
  try {
    const { socioId, mes, anio, pagada, monto, fechaPago } = req.body;
    if (!socioId || !mes || !anio)
      return res.status(400).json({ error: "socioId, mes y anio son requeridos" });

    const cuota = await Cuota.findOneAndUpdate(
      { socioId, mes, anio },
      {
        pagada: Boolean(pagada),
        monto: monto ?? null,
        fechaPago: pagada && fechaPago ? new Date(fechaPago) : null,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({
      _id: cuota._id,
      socioId: cuota.socioId,
      mes: cuota.mes,
      anio: cuota.anio,
      pagada: cuota.pagada,
      monto: cuota.monto,
      fechaPago: cuota.fechaPago,
    });
  } catch (err) {
    console.error("[cuotas] upsertCuota:", err);
    res.status(500).json({ error: "Error al guardar cuota" });
  }
};

// ── POST /api/cuotas/recordatorio/:socioId ────────────────────────────────────

exports.enviarRecordatorio = async (req, res) => {
  try {
    const socio = await Socio.findById(req.params.socioId)
      .select("nombre apellido correo numeroSocio fechaInscripcion active")
      .lean();

    if (!socio) return res.status(404).json({ error: "Socio no encontrado" });

    const parametros = await obtenerParametros();
    const todasLasCuotas = await Cuota.find({ socioId: req.params.socioId }).lean();

    const hoy = new Date();
    const hoyLimpio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

    // Ventana de 6 meses (igual que el frontend)
    const mesesVentana = [];
    const inicio = new Date(hoy.getFullYear(), hoy.getMonth() - 2, 1);
    for (let i = 0; i < 6; i++) {
      const d = new Date(inicio.getFullYear(), inicio.getMonth() + i, 1);
      mesesVentana.push({ mes: d.getMonth() + 1, anio: d.getFullYear() });
    }

    // ✅ Parseamos la fecha de inscripción sin bugs de timezone
    const altaDate = parsearFechaSegura(socio.fechaInscripcion);
    const altaMes = altaDate.getMonth() + 1;   // 1-based
    const altaAnio = altaDate.getFullYear();

    const cuotasVencidas = mesesVentana.filter(({ mes, anio }) => {
      // ✅ REGLA CORREGIDA: excluir solo si el mes es ANTERIOR al mes de inscripción
      // No comparamos por día. Si el socio se inscribió el 20/05,
      // mayo sí se cobra aunque el vencimiento (día 10) ya pasó.
      if (mesAnteriorAInscripcion(mes, anio, altaMes, altaAnio)) return false;

      const registrada = todasLasCuotas.find((c) => c.mes === mes && c.anio === anio);
      if (registrada?.pagada) return false;

      // Vencida = el día de cierre del mes ya pasó (estrictamente antes de hoy)
      const venc = new Date(anio, mes - 1, parametros.diaCierre);
      if (venc >= hoyLimpio) return false;  // pendiente o vence hoy → no incluir

      return true;
    });

    if (cuotasVencidas.length === 0) {
      return res.status(400).json({ error: "Este socio no tiene cuotas vencidas." });
    }

    await enviarCorreoRecordatorio({
      nombre: socio.nombre,
      apellido: socio.apellido,
      correo: socio.correo,
      numeroSocio: socio.numeroSocio,
      cuotasVencidas,
      montoBase: parametros.montoBase,
      moneda: parametros.moneda,
    });

    res.json({ ok: true, mensaje: `Recordatorio enviado a ${socio.correo}` });
  } catch (err) {
    console.error("[cuotas] enviarRecordatorio:", err);
    res.status(500).json({ error: "No se pudo enviar el recordatorio." });
  }
};