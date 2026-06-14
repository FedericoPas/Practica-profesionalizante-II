import { createClient } from "@supabase/supabase-js";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;
const storageBucket = "course-content";

if (!supabaseUrl || !supabaseSecretKey) {
  throw new Error("Faltan SUPABASE_URL o SUPABASE_SECRET_KEY en backend/.env");
}

const supabase = createClient(supabaseUrl, supabaseSecretKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

function createAuthClient() {
  return createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

app.use(cors());
app.use(express.json({ limit: "2mb" }));

const initialCourses = [
  {
    title: "Mecanica Automotriz Basica",
    description:
      "Aprende herramientas, seguridad, mantenimiento preventivo y diagnostico inicial del vehiculo.",
    level: "Inicial",
    duration: "8 semanas",
    price: 45000,
    image_url:
      "https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Diagnostico Electronico",
    description:
      "Uso de scanner, lectura de codigos de falla, sensores, actuadores y criterios de diagnostico.",
    level: "Intermedio",
    duration: "6 semanas",
    price: 52000,
    image_url:
      "https://images.unsplash.com/photo-1625047509168-a7026f36de04?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Sistemas de Inyeccion Nafta",
    description:
      "Analisis completo de sistemas de inyeccion, presion de combustible, cuerpo mariposa y puesta a punto.",
    level: "Avanzado",
    duration: "10 semanas",
    price: 68000,
    image_url:
      "https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&w=900&q=80",
  },
];

const initialModules = [
  {
    title: "Modulo 1: Fundamentos del taller",
    description: "Herramientas, normas de seguridad y mantenimiento preventivo.",
    content: "Material inicial para conocer el entorno de trabajo y las practicas basicas.",
    position: 1,
  },
  {
    title: "Modulo 2: Motor y diagnostico",
    description: "Componentes del motor, lubricacion, refrigeracion y fallas frecuentes.",
    content: "Contenido teorico y practico para interpretar sintomas y revisar el motor.",
    position: 2,
  },
  {
    title: "Modulo 3: Electronica automotriz",
    description: "Scanner, sensores, actuadores y codigos de falla.",
    content: "Practicas para realizar diagnostico electronico basico e intermedio.",
    position: 3,
  },
];

function required(body, fields) {
  return fields.every((field) => typeof body[field] === "string" && body[field].trim());
}

function sendDatabaseError(res, error) {
  console.error(error);
  return res.status(500).json({
    message: "No se pudo completar la operacion en la base de datos.",
    detail: error.message,
  });
}

function courseResponse(course) {
  return {
    id: course.id,
    title: course.title,
    description: course.description || "",
    level: course.level || "",
    duration: course.duration || "",
    price: Number(course.price || 0),
    category: course.level || "Formacion",
    image: course.image_url || "",
    modules: [],
  };
}

function moduleResponse(module) {
  return {
    id: module.id,
    courseId: module.course_id,
    title: module.title,
    description: module.description || "",
    content: module.content || "",
    position: module.position,
    updatedAt: module.created_at || "",
  };
}

function contentResponse(content, signedUrl = "") {
  return {
    id: content.id,
    moduleId: content.module_id,
    title: content.title,
    fileName: content.file_name,
    storagePath: content.storage_path,
    kind: content.content_type,
    mimeType: content.content_type === "video" ? "video/*" : "application/pdf",
    dataUrl: signedUrl,
    createdAt: content.created_at,
  };
}

async function ensureInitialData() {
  const { data: existingCourses, error: coursesReadError } = await supabase
    .from("courses")
    .select("id")
    .limit(1);

  if (coursesReadError) {
    throw coursesReadError;
  }

  if (existingCourses.length === 0) {
    const { error } = await supabase.from("courses").insert(initialCourses);
    if (error) throw error;
  }

  const { data: existingModules, error: modulesReadError } = await supabase
    .from("modules")
    .select("id")
    .limit(1);

  if (modulesReadError) {
    throw modulesReadError;
  }

  if (existingModules.length === 0) {
    const { data: firstCourse, error: courseError } = await supabase
      .from("courses")
      .select("id")
      .order("created_at")
      .limit(1)
      .single();

    if (courseError) throw courseError;

    const { error } = await supabase
      .from("modules")
      .insert(initialModules.map((module) => ({ ...module, course_id: firstCourse.id })));

    if (error) throw error;
  }
}

async function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");

  if (!token) {
    return res.status(401).json({ message: "Tenes que iniciar sesion." });
  }

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return res.status(401).json({ message: "La sesion no es valida o vencio." });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", data.user.id)
    .single();

  req.currentUser = {
    id: data.user.id,
    email: data.user.email,
    name: profile?.full_name || data.user.user_metadata?.full_name || "Alumno",
    role: profile?.role || "student",
  };

  return next();
}

function requireAdmin(req, res, next) {
  if (req.currentUser?.role !== "admin") {
    return res.status(403).json({ message: "Esta accion requiere permisos de administrador." });
  }

  return next();
}

app.get("/api/health", async (req, res) => {
  const { error } = await supabase.from("profiles").select("id").limit(1);
  res.status(error ? 503 : 200).json({
    status: error ? "error" : "ok",
    database: error ? error.message : "connected",
    project: "Aprende Mecanica Automotriz",
  });
});

app.get("/", (req, res) => {
  res.json({ message: "API de Aprende Mecanica Automotriz", health: "/api/health" });
});

app.get("/api/courses", async (req, res) => {
  try {
    await ensureInitialData();
    const { data, error } = await supabase.from("courses").select("*").order("created_at");
    if (error) return sendDatabaseError(res, error);
    return res.json(data.map(courseResponse));
  } catch (error) {
    return sendDatabaseError(res, error);
  }
});

app.get("/api/courses/:id", async (req, res) => {
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .eq("id", req.params.id)
    .single();

  if (error) {
    return res.status(404).json({ message: "Curso no encontrado." });
  }

  return res.json(courseResponse(data));
});

app.post("/api/auth/register", async (req, res) => {
  if (!required(req.body, ["name", "email", "password"])) {
    return res.status(400).json({ message: "Faltan datos obligatorios." });
  }

  const email = req.body.email.trim().toLowerCase();
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password: req.body.password,
    email_confirm: true,
    user_metadata: { full_name: req.body.name.trim() },
  });

  if (createError) {
    return res.status(409).json({ message: createError.message });
  }

  const { error: profileError } = await supabase.from("profiles").upsert({
    id: created.user.id,
    full_name: req.body.name.trim(),
    role: "student",
  });

  if (profileError) {
    return sendDatabaseError(res, profileError);
  }

  const { data: login, error: loginError } = await createAuthClient().auth.signInWithPassword({
    email,
    password: req.body.password,
  });

  if (loginError) {
    return res.status(201).json({
      message: "Usuario registrado. Ya podes iniciar sesion.",
      user: { id: created.user.id, name: req.body.name.trim(), email, role: "student" },
    });
  }

  return res.status(201).json({
    message: "Usuario registrado.",
    accessToken: login.session.access_token,
    user: { id: created.user.id, name: req.body.name.trim(), email, role: "student" },
  });
});

app.post("/api/auth/login", async (req, res) => {
  if (!required(req.body, ["email", "password"])) {
    return res.status(400).json({ message: "Faltan datos obligatorios." });
  }

  const email = req.body.email.trim().toLowerCase();
  const { data, error } = await createAuthClient().auth.signInWithPassword({
    email,
    password: req.body.password,
  });

  if (error) {
    return res.status(401).json({ message: "Email o contrasena incorrectos." });
  }

  let { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", data.user.id)
    .single();

  if (email === "admin@gmail.com" && profile?.role !== "admin") {
    const { data: updatedProfile, error: roleError } = await supabase
      .from("profiles")
      .update({ role: "admin" })
      .eq("id", data.user.id)
      .select("full_name, role")
      .single();

    if (roleError) {
      return sendDatabaseError(res, roleError);
    }

    profile = updatedProfile;
  }

  return res.json({
    message: "Inicio de sesion correcto.",
    accessToken: data.session.access_token,
    user: {
      id: data.user.id,
      name: profile?.full_name || data.user.user_metadata?.full_name || "Alumno",
      email: data.user.email,
      role: profile?.role || "student",
    },
  });
});

app.get("/api/users", authenticate, requireAdmin, async (req, res) => {
  const [{ data: profiles, error }, { data: authUsers, error: authError }] =
    await Promise.all([
      supabase.from("profiles").select("id, full_name, role, created_at").order("created_at"),
      supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);

  if (error || authError) {
    return sendDatabaseError(res, error || authError);
  }

  const emailById = new Map(authUsers.users.map((user) => [user.id, user.email]));
  return res.json(
    profiles.map((profile) => ({
      id: profile.id,
      name: profile.full_name,
      email: emailById.get(profile.id) || "",
      role: profile.role,
      createdAt: profile.created_at,
    })),
  );
});

app.delete("/api/users/:id", authenticate, requireAdmin, async (req, res) => {
  if (req.params.id === req.currentUser.id) {
    return res.status(403).json({ message: "No podes eliminar tu propio usuario administrador." });
  }

  const { error } = await supabase.auth.admin.deleteUser(req.params.id);
  if (error) return sendDatabaseError(res, error);
  return res.json({ message: "Alumno eliminado." });
});

app.get("/api/teaching-modules", async (req, res) => {
  try {
    await ensureInitialData();
    const { data, error } = await supabase.from("modules").select("*").order("position");
    if (error) return sendDatabaseError(res, error);
    return res.json(data.map(moduleResponse));
  } catch (error) {
    return sendDatabaseError(res, error);
  }
});

app.put(
  "/api/teaching-modules/:id",
  authenticate,
  requireAdmin,
  async (req, res) => {
    const { data, error } = await supabase
      .from("modules")
      .update({
        title: req.body.title?.trim(),
        description: req.body.description?.trim() || "",
        content: req.body.content?.trim() || "",
      })
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) return sendDatabaseError(res, error);
    return res.json({ message: "Modulo actualizado.", module: moduleResponse(data) });
  },
);

app.get("/api/module-contents", async (req, res) => {
  const { data, error } = await supabase
    .from("module_contents")
    .select("*")
    .order("created_at");

  if (error) return sendDatabaseError(res, error);

  const contents = await Promise.all(
    data.map(async (content) => {
      const { data: signed } = await supabase.storage
        .from(storageBucket)
        .createSignedUrl(content.storage_path, 3600);
      return contentResponse(content, signed?.signedUrl || "");
    }),
  );

  return res.json(contents);
});

app.post(
  "/api/module-contents/upload-url",
  authenticate,
  requireAdmin,
  async (req, res) => {
    if (!required(req.body, ["moduleId", "fileName", "mimeType"])) {
      return res.status(400).json({ message: "Faltan datos del archivo." });
    }

    const safeName = req.body.fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `${req.body.moduleId}/${crypto.randomUUID()}-${safeName}`;
    const { data, error } = await supabase.storage
      .from(storageBucket)
      .createSignedUploadUrl(path);

    if (error) return sendDatabaseError(res, error);
    return res.json({ path, token: data.token });
  },
);

app.post("/api/module-contents", authenticate, requireAdmin, async (req, res) => {
  if (!required(req.body, ["moduleId", "title", "fileName", "storagePath", "kind"])) {
    return res.status(400).json({ message: "Faltan datos del contenido." });
  }

  const { data, error } = await supabase
    .from("module_contents")
    .insert({
      module_id: req.body.moduleId,
      title: req.body.title.trim(),
      file_name: req.body.fileName,
      storage_path: req.body.storagePath,
      content_type: req.body.kind,
    })
    .select()
    .single();

  if (error) return sendDatabaseError(res, error);
  return res.status(201).json({ message: "Contenido guardado.", content: contentResponse(data) });
});

app.delete("/api/module-contents/:id", authenticate, requireAdmin, async (req, res) => {
  const { data: content, error: readError } = await supabase
    .from("module_contents")
    .select("storage_path")
    .eq("id", req.params.id)
    .single();

  if (readError) return res.status(404).json({ message: "Contenido no encontrado." });

  const { error: storageError } = await supabase.storage
    .from(storageBucket)
    .remove([content.storage_path]);
  if (storageError) return sendDatabaseError(res, storageError);

  const { error } = await supabase.from("module_contents").delete().eq("id", req.params.id);
  if (error) return sendDatabaseError(res, error);
  return res.json({ message: "Contenido eliminado." });
});

app.get("/api/enrollments", authenticate, requireAdmin, async (req, res) => {
  const { data, error } = await supabase
    .from("enrollments")
    .select("*, courses(title)")
    .order("created_at", { ascending: false });

  if (error) return sendDatabaseError(res, error);
  return res.json(
    data.map((item) => ({
      id: item.id,
      name: item.name,
      email: item.email,
      phone: item.phone || "",
      courseId: item.course_id,
      courseTitle: item.courses?.title || "Curso",
      createdAt: item.created_at,
    })),
  );
});

app.post("/api/enrollments", async (req, res) => {
  if (!required(req.body, ["name", "email", "courseId"])) {
    return res.status(400).json({ message: "Faltan datos obligatorios." });
  }

  const { data, error } = await supabase
    .from("enrollments")
    .insert({
      name: req.body.name.trim(),
      email: req.body.email.trim().toLowerCase(),
      phone: req.body.phone?.trim() || "",
      course_id: req.body.courseId,
    })
    .select()
    .single();

  if (error) return sendDatabaseError(res, error);
  return res.status(201).json({ message: "Inscripcion registrada.", enrollment: data });
});

app.delete("/api/enrollments/:id", authenticate, requireAdmin, async (req, res) => {
  const { error } = await supabase.from("enrollments").delete().eq("id", req.params.id);
  if (error) return sendDatabaseError(res, error);
  return res.json({ message: "Inscripcion eliminada." });
});

app.get("/api/payments/me", authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("user_id", req.currentUser.id)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (error) return sendDatabaseError(res, error);
  return res.json(
    data.map((payment) => ({
      id: payment.id,
      email: req.currentUser.email,
      name: req.currentUser.name,
      courseId: payment.course_id,
      amount: Number(payment.amount),
      status: payment.status,
      paidAt: payment.created_at,
    })),
  );
});

app.post("/api/payments/approve", authenticate, async (req, res) => {
  if (!required(req.body, ["courseId"])) {
    return res.status(400).json({ message: "Falta seleccionar el curso." });
  }

  const amount = Number(req.body.amount || 0);
  const { data, error } = await supabase
    .from("payments")
    .insert({
      user_id: req.currentUser.id,
      course_id: req.body.courseId,
      amount,
      status: "approved",
    })
    .select()
    .single();

  if (error) return sendDatabaseError(res, error);
  return res.status(201).json({ message: "Pago aprobado.", payment: data });
});

app.post("/api/contact", async (req, res) => {
  if (!required(req.body, ["name", "email", "message"])) {
    return res.status(400).json({ message: "Faltan datos obligatorios." });
  }

  const { data, error } = await supabase
    .from("consultations")
    .insert({
      name: req.body.name.trim(),
      email: req.body.email.trim().toLowerCase(),
      question: req.body.message.trim(),
    })
    .select()
    .single();

  if (error) return sendDatabaseError(res, error);
  return res.status(201).json({ message: "Consulta enviada.", contact: data });
});

app.get("/api/contact", async (req, res) => {
  let query = supabase.from("consultations").select("*").order("created_at", {
    ascending: false,
  });

  if (req.query.email) {
    query = query.eq("email", req.query.email.toString().trim().toLowerCase());
  }

  const { data, error } = await query;
  if (error) return sendDatabaseError(res, error);
  return res.json(
    data.map((item) => ({
      id: item.id,
      name: item.name,
      email: item.email,
      message: item.question,
      answer: item.answer || "",
      answeredAt: item.answered_at || "",
      createdAt: item.created_at,
    })),
  );
});

app.put("/api/contact/:id/respond", authenticate, requireAdmin, async (req, res) => {
  if (!required(req.body, ["answer"])) {
    return res.status(400).json({ message: "La respuesta es obligatoria." });
  }

  const { data, error } = await supabase
    .from("consultations")
    .update({ answer: req.body.answer.trim(), answered_at: new Date().toISOString() })
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) return sendDatabaseError(res, error);
  return res.json({ message: "Respuesta enviada.", contact: data });
});

if (process.env.VERCEL !== "1") {
  app.listen(port, () => {
    console.log(`API disponible en http://localhost:${port}`);
  });
}

export default app;
