import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";

const API_URLS = [
  import.meta.env.VITE_API_URL,
  "/backend",
  "http://localhost:4000/api",
  "http://127.0.0.1:4000/api",
].filter(Boolean);

const fallbackCourses = [
  {
    id: "mecanica-basica",
    title: "Mecanica Automotriz Basica",
    level: "Inicial",
    duration: "8 semanas",
    price: 45000,
    category: "Fundamentos",
    image:
      "https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&w=900&q=80",
    description:
      "Aprende herramientas, seguridad, mantenimiento preventivo y diagnostico inicial del vehiculo.",
    modules: [
      "Herramientas y seguridad en el taller",
      "Motor, lubricacion y refrigeracion",
      "Frenos, suspension y direccion",
      "Practicas de mantenimiento preventivo",
    ],
  },
  {
    id: "diagnostico-electronico",
    title: "Diagnostico Electronico",
    level: "Intermedio",
    duration: "6 semanas",
    price: 52000,
    category: "Electronica",
    image:
      "https://images.unsplash.com/photo-1625047509168-a7026f36de04?auto=format&fit=crop&w=900&q=80",
    description:
      "Uso de scanner, lectura de codigos de falla, sensores, actuadores y criterios de diagnostico.",
    modules: [
      "Introduccion a sistemas electronicos",
      "Uso de scanner OBD2",
      "Sensores y actuadores",
      "Resolucion de fallas frecuentes",
    ],
  },
  {
    id: "inyeccion-nafta",
    title: "Sistemas de Inyeccion Nafta",
    level: "Avanzado",
    duration: "10 semanas",
    price: 68000,
    category: "Motor",
    image:
      "https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&w=900&q=80",
    description:
      "Analisis completo de sistemas de inyeccion, presion de combustible, cuerpo mariposa y puesta a punto.",
    modules: [
      "Componentes del sistema de inyeccion",
      "Medicion de presion y caudal",
      "Limpieza y comprobacion de inyectores",
      "Diagnostico aplicado en taller",
    ],
  },
];

const fallbackTeachingModules = [
  {
    id: "modulo-1",
    title: "Modulo 1: Fundamentos del taller",
    description: "Herramientas, normas de seguridad y mantenimiento preventivo.",
    content: "Material inicial para conocer el entorno de trabajo y las practicas basicas.",
    videoUrl: "",
    fileUrl: "",
    updatedAt: "",
  },
  {
    id: "modulo-2",
    title: "Modulo 2: Motor y diagnostico",
    description: "Componentes del motor, lubricacion, refrigeracion y fallas frecuentes.",
    content: "Contenido teorico y practico para interpretar sintomas y revisar el motor.",
    videoUrl: "",
    fileUrl: "",
    updatedAt: "",
  },
  {
    id: "modulo-3",
    title: "Modulo 3: Electronica automotriz",
    description: "Scanner, sensores, actuadores y codigos de falla.",
    content: "Practicas para realizar diagnostico electronico basico e intermedio.",
    videoUrl: "",
    fileUrl: "",
    updatedAt: "",
  },
];

function money(value) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

async function apiRequest(path, options) {
  let lastError;
  const savedUser = JSON.parse(localStorage.getItem("aprende_mecanica_usuario") || "null");

  for (const apiUrl of API_URLS) {
    try {
      const response = await fetch(`${apiUrl}${path}`, {
        ...options,
        headers: {
          ...(options?.headers || {}),
          ...(savedUser?.accessToken
            ? { Authorization: `Bearer ${savedUser.accessToken}` }
            : {}),
        },
      });

      if (response.ok) {
        return response;
      }

      lastError = new Error(`La API respondio con estado ${response.status}`);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

function isAdmin(user) {
  return user?.role === "admin" || user?.email?.toLowerCase() === "admin@gmail.com";
}

function paymentKey(user) {
  return user?.email?.toLowerCase() || "";
}

function App() {
  const [page, setPage] = useState(() => window.location.hash.replace("#", "") || "inicio");
  const [courses, setCourses] = useState(fallbackCourses);
  const [selectedCourseId, setSelectedCourseId] = useState("mecanica-basica");
  const [enrollments, setEnrollments] = useState([]);
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [teachingModules, setTeachingModules] = useState(fallbackTeachingModules);
  const [moduleContents, setModuleContents] = useState([]);
  const [selectedModuleId, setSelectedModuleId] = useState("");
  const [contactMessages, setContactMessages] = useState([]);
  const [enrollmentStatus, setEnrollmentStatus] = useState("");
  const [contactStatus, setContactStatus] = useState("");
  const [authStatus, setAuthStatus] = useState("");
  const [adminStatus, setAdminStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [paidStudents, setPaidStudents] = useState([]);
  const [currentUser, setCurrentUser] = useState(() => {
    return JSON.parse(localStorage.getItem("aprende_mecanica_usuario") || "null");
  });

  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === selectedCourseId) || courses[0],
    [courses, selectedCourseId],
  );
  const hasPaidAccess =
    isAdmin(currentUser) || paidStudents.some((payment) => payment.email === paymentKey(currentUser));

  useEffect(() => {
    function handleHashChange() {
      setPage(window.location.hash.replace("#", "") || "inicio");
    }

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    apiRequest("/courses")
      .then((response) => response.json())
      .then((data) => {
        setCourses(data);
        setSelectedCourseId(data[0]?.id || "");
      })
      .catch(() => {
        setCourses(fallbackCourses);
      });
  }, []);

  useEffect(() => {
    loadTeachingModules();
    loadModuleContents();
    loadContactMessages("all");
  }, []);

  useEffect(() => {
    if (page === "admin" && isAdmin(currentUser)) {
      loadUsers();
      loadEnrollments();
      loadTeachingModules();
      loadModuleContents();
      loadContactMessages("all");
    }

    if (page === "modulos") {
      loadTeachingModules();
      loadModuleContents();
    }

    if (page === "mis-consultas") {
      loadContactMessages("mine");
    }

    if (page === "inicio" || page === "contacto") {
      loadContactMessages("all");
    }

    if (currentUser && !isAdmin(currentUser)) {
      loadPaymentStatus();
    }
  }, [page, currentUser]);

  function saveSession(user, accessToken = "") {
    const sessionUser = { ...user, accessToken: accessToken || user.accessToken || "" };
    localStorage.setItem("aprende_mecanica_usuario", JSON.stringify(sessionUser));
    setCurrentUser(sessionUser);
  }

  function logout() {
    localStorage.removeItem("aprende_mecanica_usuario");
    setCurrentUser(null);
    setAuthStatus("");
    window.location.hash = "inicio";
  }

  async function handlePayment(event) {
    event.preventDefault();

    if (!currentUser) {
      setPaymentStatus("Para abonar primero tenes que iniciar sesion.");
      return;
    }

    try {
      await apiRequest("/payments/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: selectedCourse?.id,
          amount: selectedCourse?.price || 45000,
        }),
      });
      await loadPaymentStatus();
      setPaymentStatus("Pago aprobado. Ya podes acceder a todos los contenidos.");
    } catch {
      setPaymentStatus("No se pudo registrar el pago. Volve a iniciar sesion e intenta otra vez.");
    }
  }

  async function handleRegister(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form).entries());
    const email = payload.email.trim().toLowerCase();

    if (payload.password.length < 6) {
      setAuthStatus("La contrasena debe tener al menos 6 caracteres.");
      return;
    }

    if (email === "admin@gmail.com") {
      setAuthStatus("Ese email esta reservado para el administrador. Usa Iniciar sesion.");
      return;
    }

    try {
      const response = await apiRequest("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!data.accessToken) {
        setAuthStatus("Registro correcto. Ahora inicia sesion.");
        window.location.hash = "login";
        return;
      }

      saveSession(data.user, data.accessToken);
      form.reset();
      setAuthStatus("Registro correcto. Sesion iniciada.");
      window.location.hash = "inicio";
    } catch {
      setAuthStatus("No se pudo registrar. Revisa el email o intenta nuevamente.");
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form).entries());
    const email = payload.email.trim().toLowerCase();

    try {
      const response = await apiRequest("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      saveSession(data.user, data.accessToken);
      form.reset();
      setAuthStatus("Inicio de sesion correcto.");
      window.location.hash = isAdmin(data.user) ? "admin" : "inicio";
    } catch {
      setAuthStatus("Email o contrasena incorrectos.");
    }
  }

  async function loadUsers() {
    try {
      const response = await apiRequest("/users");
      const apiUsers = await response.json();
      setRegisteredUsers(apiUsers.map((user) => ({ ...user, source: "Supabase" })));
    } catch {
      setRegisteredUsers([]);
      setAdminStatus("No se pudieron cargar los usuarios desde Supabase.");
    }
  }

  async function loadModuleContents() {
    try {
      const response = await apiRequest("/module-contents");
      setModuleContents(await response.json());
    } catch {
      setModuleContents([]);
    }
  }

  async function handleContentUpload(event, moduleId) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const file = formData.get("file");

    if (!file || !file.name) {
      setAdminStatus("Selecciona un archivo PDF o video.");
      return;
    }

    try {
      const kind = file.type?.startsWith("video/") ? "video" : "pdf";
      const uploadResponse = await apiRequest("/module-contents/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleId,
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
        }),
      });
      const upload = await uploadResponse.json();
      const { error: uploadError } = await supabase.storage
        .from("course-content")
        .uploadToSignedUrl(upload.path, upload.token, file, {
          contentType: file.type || "application/octet-stream",
        });

      if (uploadError) {
        throw uploadError;
      }

      await apiRequest("/module-contents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleId,
          title: formData.get("title")?.trim() || file.name,
          fileName: file.name,
          storagePath: upload.path,
          kind,
        }),
      });

      await loadModuleContents();
      form.reset();
      setAdminStatus("Contenido cargado correctamente en el modulo.");
    } catch (error) {
      console.error("No se pudo cargar el archivo", error);
      setAdminStatus("No se pudo cargar el archivo. Prueba con un archivo mas liviano.");
    }
  }

  async function handleContentDelete(contentId) {
    try {
      await apiRequest(`/module-contents/${contentId}`, { method: "DELETE" });
      await loadModuleContents();
      setAdminStatus("Contenido eliminado del modulo.");
    } catch {
      setAdminStatus("No se pudo eliminar el contenido.");
    }
  }

  async function handleDeleteUser(user) {
    if (isAdmin(user)) {
      setAdminStatus("No se puede eliminar el administrador.");
      return;
    }

    try {
      await apiRequest(`/users/${user.id}`, { method: "DELETE" });
      setAdminStatus("Alumno eliminado correctamente.");
    } catch {
      setAdminStatus("No se pudo eliminar el alumno.");
    }

    loadUsers();
    loadEnrollments();
  }

  async function loadTeachingModules() {
    try {
      const response = await apiRequest("/teaching-modules");
      const data = await response.json();
      setTeachingModules(data);
    } catch {
      setTeachingModules(fallbackTeachingModules);
    }
  }

  async function handleModuleSave(event, moduleId) {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form).entries());
    const updatedModules = teachingModules.map((module) =>
      module.id === moduleId
        ? { ...module, ...payload, updatedAt: new Date().toISOString() }
        : module,
    );

    try {
      const response = await apiRequest(`/teaching-modules/${moduleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      setTeachingModules(
        updatedModules.map((module) => (module.id === moduleId ? data.module : module)),
      );
      setAdminStatus("Modulo actualizado correctamente.");
    } catch {
      setAdminStatus("No se pudo actualizar el modulo.");
    }
  }

  function mergeLocalContactMessages(apiMessages = []) {
    setContactMessages(
      apiMessages.map((message) => ({ ...message, source: "Supabase" })),
    );
  }

  async function loadContactMessages(scope = "all") {
    try {
      const query = scope === "mine" && currentUser ? `?email=${currentUser.email}` : "";
      const response = await apiRequest(`/contact${query}`);
      const data = await response.json();
      mergeLocalContactMessages(data);
    } catch {
      mergeLocalContactMessages();
    }
  }

  async function handleContactAnswer(event, contactId) {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form).entries());
    const updatedMessages = contactMessages.map((message) =>
      message.id === contactId
        ? { ...message, answer: payload.answer, answeredAt: new Date().toISOString() }
        : message,
    );

    setContactMessages(updatedMessages);

    try {
      await apiRequest(`/contact/${contactId}/respond`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setAdminStatus("Respuesta enviada correctamente.");
      loadContactMessages("all");
    } catch {
      setAdminStatus("No se pudo enviar la respuesta.");
    }
  }

  function mergeLocalEnrollments(apiEnrollments = []) {
    setEnrollments(
      apiEnrollments.map((enrollment) => ({ ...enrollment, source: "Supabase" })),
    );
  }

  async function loadPaymentStatus() {
    if (!currentUser || isAdmin(currentUser)) {
      return;
    }

    try {
      const response = await apiRequest("/payments/me");
      setPaidStudents(await response.json());
    } catch {
      setPaidStudents([]);
    }
  }

  async function loadEnrollments() {
    try {
      const response = await apiRequest("/enrollments");
      const data = await response.json();
      mergeLocalEnrollments(data);
    } catch {
      mergeLocalEnrollments();
    }
  }

  async function handleEnrollment(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    try {
      const response = await apiRequest("/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("No se pudo registrar la inscripcion");
      }

      form.reset();
      setEnrollmentStatus("Inscripcion registrada. El instructor se comunicara a la brevedad.");
      loadEnrollments();
    } catch (error) {
      console.error("No se pudo registrar la inscripcion.", error);
      setEnrollmentStatus("No se pudo registrar la inscripcion. Intenta nuevamente.");
    }
  }

  async function handleContact(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    try {
      const response = await apiRequest("/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("No se pudo enviar la consulta");
      }

      form.reset();
      setContactStatus("Consulta enviada correctamente.");
      loadContactMessages("all");
    } catch (error) {
      console.error("No se pudo enviar la consulta.", error);
      setContactStatus("No se pudo enviar la consulta. Intenta nuevamente.");
    }
  }

  function renderNav() {
    const currentUserBadge = isAdmin(currentUser) ? "Administrador" : currentUser?.name;

    return (
      <nav className="topbar" aria-label="Navegacion principal">
        <a className="brandLink" href="#inicio">
          Aprende Mecanica Automotriz
        </a>
        <div>
          <a href="#inicio">Inicio</a>
          <a href="#cursos">Cursos</a>
          <a href="#inscripcion">Inscripcion</a>
          <a href="#contacto">Contacto</a>
          {currentUser ? (
            <>
              <a href="#modulos">Mis modulos</a>
              <a href="#mis-consultas">Mis consultas</a>
              {isAdmin(currentUser) && <a href="#admin">Admin</a>}
              <span className="userBadge">{currentUserBadge}</span>
              <button className="linkButton" type="button" onClick={logout}>
                Salir
              </button>
            </>
          ) : (
            <>
              <a href="#registrarse">Registrarse</a>
              <a href="#login">Iniciar sesion</a>
            </>
          )}
        </div>
      </nav>
    );
  }

  function renderFooter() {
    return (
      <footer className="siteFooter">
        <div className="footerBrand">
          <strong>Aprende Mecanica Automotriz</strong>
          <p>
            Plataforma de capacitacion tecnica para organizar cursos, videoclases,
            materiales y comunicacion entre instructor y alumnos.
          </p>
          <p className="footerNote">
            Escuela online ficticia para formacion practica en mecanica, diagnostico
            y mantenimiento automotriz.
          </p>
        </div>

        <div className="footerBlock">
          <h3>Contacto</h3>
          <span>Telefono: +54 9 11 2456-7890</span>
          <span>Email: consultas@aprendemecanica.com</span>
          <span>Direccion: Av. Taller 1450, Buenos Aires</span>
          <span>Horario: Lun. a Vie. de 9:00 a 18:00</span>
        </div>

        <div className="footerBlock">
          <h3>Redes</h3>
          <a href="#inicio">Instagram: @aprende.mecanica</a>
          <a href="#inicio">Facebook: Aprende Mecanica Online</a>
          <a href="#inicio">YouTube: Taller Virtual AM</a>
          <a href="#inicio">WhatsApp: Consultas y turnos</a>
        </div>

        <div className="footerBlock">
          <h3>Accesos</h3>
          <a href="#cursos">Cursos disponibles</a>
          <a href="#vista-previa">Vista previa de modulos</a>
          <a href="#inscripcion">Inscripcion</a>
          <a href="#contacto">Foro de consultas</a>
        </div>
      </footer>
    );
  }

  if (page === "modulos") {
    const selectedModule = teachingModules.find((module) => module.id === selectedModuleId);
    const selectedContents = moduleContents.filter(
      (content) => content.moduleId === selectedModuleId,
    );

    return (
      <main>
        <header className="authHeader">{renderNav()}</header>
        <section className="contentPage">
          <div className="studentsHeader">
            <div>
              <span className="eyebrow">Aula virtual</span>
              <h1>Modulos de ensenanza</h1>
            </div>
          </div>

          {!currentUser ? (
            <div className="emptyState">
              <p>Para ver los modulos primero tenes que iniciar sesion como alumno.</p>
              <a className="primaryAction" href="#login">
                Iniciar sesion
              </a>
            </div>
          ) : !hasPaidAccess ? (
            <>
              <section className="paymentPanel">
                <div>
                  <span className="eyebrow">Acceso al curso</span>
                  <h2>Abonar para desbloquear contenidos</h2>
                  <p>
                    Podes ver la previa de los modulos. Para abrir las videoclases y PDFs
                    cargados por el instructor, primero tenes que abonar el curso.
                  </p>
                </div>
                <form className="paymentForm" onSubmit={handlePayment}>
                  <input name="cardName" placeholder="Nombre en la tarjeta" required />
                  <input name="cardNumber" placeholder="Numero de tarjeta" required />
                  <div className="paymentGrid">
                    <input name="expiry" placeholder="MM/AA" required />
                    <input name="cvv" placeholder="CVV" required />
                  </div>
                  <button type="submit">Abonar $45.000</button>
                  {paymentStatus && <p className="status">{paymentStatus}</p>}
                </form>
              </section>

              <div className="learningGrid">
                {teachingModules.map((module) => (
                  <article className="learningCard lockedCard" key={module.id}>
                    <span className="eyebrow">Vista previa</span>
                    <h2>{module.title}</h2>
                    <p>{module.description}</p>
                    <div className="lockedNotice">Contenido bloqueado hasta abonar el curso.</div>
                  </article>
                ))}
              </div>
            </>
          ) : selectedModule ? (
            <div className="moduleDetail">
              <button type="button" onClick={() => setSelectedModuleId("")}>
                Volver a modulos
              </button>
              <article className="learningCard">
                <span className="eyebrow">{selectedModule.id.replace("-", " ")}</span>
                <h2>{selectedModule.title}</h2>
                <p>{selectedModule.description}</p>
                <div className="moduleContent">{selectedModule.content}</div>
              </article>

              <section className="adminBlock">
                <h2>Contenidos del modulo</h2>
                {selectedContents.length === 0 ? (
                  <p className="emptyState">Todavia no hay videos o PDFs cargados en este modulo.</p>
                ) : (
                  <div className="contentList">
                    {selectedContents.map((content) => (
                      <article className="contentItem" key={content.id}>
                        <span className="eyebrow">{content.kind === "video" ? "Videoclase" : "PDF"}</span>
                        <h3>{content.title}</h3>
                        <p>{content.fileName}</p>
                        {content.kind === "video" ? (
                          <video src={content.dataUrl} controls />
                        ) : (
                          <iframe title={content.title} src={content.dataUrl} />
                        )}
                        <a href={content.dataUrl} download={content.fileName}>
                          Descargar archivo
                        </a>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </div>
          ) : (
            <div className="learningGrid">
              {teachingModules.map((module) => (
                <article className="learningCard" key={module.id}>
                  <span className="eyebrow">{module.id.replace("-", " ")}</span>
                  <h2>{module.title}</h2>
                  <p>{module.description}</p>
                  <div className="moduleContent">{module.content}</div>
                  {module.videoUrl && (
                    <a href={module.videoUrl} target="_blank" rel="noreferrer">
                      Ver videoclase
                    </a>
                  )}
                  {module.fileUrl && (
                    <a href={module.fileUrl} target="_blank" rel="noreferrer">
                      Descargar material
                    </a>
                  )}
                  <button type="button" onClick={() => setSelectedModuleId(module.id)}>
                    Abrir modulo
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
        {renderFooter()}
      </main>
    );
  }

  if (page === "mis-consultas") {
    const myMessages = contactMessages.filter(
      (message) => message.email === currentUser?.email?.toLowerCase(),
    );

    return (
      <main>
        <header className="authHeader">{renderNav()}</header>
        <section className="contentPage">
          <div className="studentsHeader">
            <div>
              <span className="eyebrow">Consultas</span>
              <h1>Mis consultas</h1>
            </div>
            {currentUser && (
              <button type="button" onClick={() => loadContactMessages("mine")}>
                Actualizar respuestas
              </button>
            )}
          </div>

          {!currentUser ? (
            <div className="emptyState">
              <p>Para ver tus consultas primero tenes que iniciar sesion.</p>
              <a className="primaryAction" href="#login">
                Iniciar sesion
              </a>
            </div>
          ) : myMessages.length === 0 ? (
            <p className="emptyState">Todavia no enviaste consultas con este usuario.</p>
          ) : (
            <div className="messageList">
              {myMessages.map((message) => (
                <article className="messageCard" key={message.id}>
                  <span className="eyebrow">{message.answer ? "Respondida" : "Pendiente"}</span>
                  <h2>{message.message}</h2>
                  {message.answer ? (
                    <div className="answerBox">
                      <strong>Respuesta del instructor</strong>
                      <p>{message.answer}</p>
                    </div>
                  ) : (
                    <p>El instructor todavia no respondio esta consulta.</p>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
        {renderFooter()}
      </main>
    );
  }

  if (page === "admin") {
    if (!isAdmin(currentUser)) {
      return (
        <main>
          <header className="authHeader">{renderNav()}</header>
          <section className="contentPage">
            <div className="emptyState">
              <h1>Acceso restringido</h1>
              <p>Esta seccion solo esta disponible para el administrador.</p>
              <a className="primaryAction" href="#login">
                Iniciar sesion
              </a>
            </div>
          </section>
          {renderFooter()}
        </main>
      );
    }

    return (
      <main>
        <header className="authHeader">{renderNav()}</header>
        <section className="contentPage">
          <div className="studentsHeader">
            <div>
              <span className="eyebrow">Administracion</span>
              <h1>Panel del administrador</h1>
            </div>
            <button type="button" onClick={loadUsers}>
              Actualizar usuarios
            </button>
          </div>

          {adminStatus && <p className="status">{adminStatus}</p>}

          <section className="adminBlock">
            <h2>Usuarios cargados</h2>
            <div className="studentsTable">
              <div className="usersRow studentsHead">
                <span>Nombre</span>
                <span>Email</span>
                <span>Rol</span>
                <span>Origen</span>
                <span>Accion</span>
              </div>
              {registeredUsers.map((user) => (
                <div className="usersRow" key={`${user.source}-${user.id}`}>
                  <span>{user.name}</span>
                  <span>{user.email}</span>
                  <span>{user.role}</span>
                  <span>{user.source}</span>
                  <span>
                    {!isAdmin(user) && (
                      <button type="button" onClick={() => handleDeleteUser(user)}>
                        Eliminar
                      </button>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="adminBlock">
            <div className="studentsHeader">
              <h2>Alumnos inscriptos</h2>
              <button type="button" onClick={loadEnrollments}>
                Actualizar inscriptos
              </button>
            </div>

            {enrollments.length === 0 ? (
              <p className="emptyState">Todavia no hay alumnos inscriptos en esta sesion.</p>
            ) : (
              <div className="studentsTable">
                <div className="studentsRow studentsHead">
                  <span>Nombre</span>
                  <span>Email</span>
                  <span>Telefono</span>
                  <span>Curso</span>
                  <span>Origen</span>
                </div>
                {enrollments.map((enrollment) => (
                  <div className="studentsRow" key={enrollment.id}>
                    <span>{enrollment.name}</span>
                    <span>{enrollment.email}</span>
                    <span>{enrollment.phone || "-"}</span>
                    <span>{enrollment.courseTitle}</span>
                    <span>{enrollment.source}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="adminBlock">
            <div className="studentsHeader">
              <h2>Consultas de alumnos</h2>
              <button type="button" onClick={() => loadContactMessages("all")}>
                Actualizar consultas
              </button>
            </div>

            {contactMessages.length === 0 ? (
              <p className="emptyState">Todavia no hay consultas cargadas.</p>
            ) : (
              <div className="messageList">
                {contactMessages.map((message) => (
                  <article className="messageCard" key={message.id}>
                    <span className="eyebrow">{message.source}</span>
                    <h3>{message.name}</h3>
                    <p>
                      <strong>{message.email}</strong>
                    </p>
                    <div className="moduleContent">{message.message}</div>
                    {message.answer && (
                      <div className="answerBox">
                        <strong>Respuesta actual</strong>
                        <p>{message.answer}</p>
                      </div>
                    )}
                    <form
                      className="answerForm"
                      onSubmit={(event) => handleContactAnswer(event, message.id)}
                    >
                      <textarea
                        name="answer"
                        defaultValue={message.answer}
                        placeholder="Escribir respuesta para el alumno"
                        rows="4"
                        required
                      />
                      <button type="submit">Responder consulta</button>
                    </form>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="adminBlock">
            <h2>Editar modulos de ensenanza</h2>
            <div className="moduleEditorGrid">
              {teachingModules.map((module) => (
                <article className="moduleEditor" key={module.id}>
                  <form className="moduleEditorForm" onSubmit={(event) => handleModuleSave(event, module.id)}>
                    <span className="eyebrow">{module.id.replace("-", " ")}</span>
                    <input name="title" defaultValue={module.title} placeholder="Titulo" required />
                    <textarea
                      name="description"
                      defaultValue={module.description}
                      placeholder="Descripcion"
                      rows="3"
                    />
                    <textarea
                      name="content"
                      defaultValue={module.content}
                      placeholder="Contenido del modulo"
                      rows="6"
                    />
                    <button type="submit">Guardar modulo</button>
                  </form>

                  <form className="uploadForm" onSubmit={(event) => handleContentUpload(event, module.id)}>
                    <h3>Cargar contenido</h3>
                    <input name="title" placeholder="Titulo visible para el alumno" />
                    <input name="file" type="file" accept="video/*,.pdf,application/pdf" required />
                    <button type="submit">Subir al modulo</button>
                  </form>

                  <div className="uploadedList">
                    <h3>Contenidos cargados</h3>
                    {moduleContents.filter((content) => content.moduleId === module.id).length === 0 ? (
                      <p>No hay archivos cargados.</p>
                    ) : (
                      moduleContents
                        .filter((content) => content.moduleId === module.id)
                        .map((content) => (
                          <div className="uploadedItem" key={content.id}>
                            <span>{content.title}</span>
                            <button type="button" onClick={() => handleContentDelete(content.id)}>
                              Eliminar
                            </button>
                          </div>
                        ))
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </section>
        {renderFooter()}
      </main>
    );
  }

  if (page === "registrarse") {
    return (
      <main>
        <header className="authHeader">{renderNav()}</header>
        <section className="authPage">
          <form className="authForm" onSubmit={handleRegister}>
            <span className="eyebrow">Cuenta de alumno</span>
            <h1>Registrarse</h1>
            <input name="name" placeholder="Nombre completo" required />
            <input name="email" type="email" placeholder="Email" required />
            <input name="password" type="password" placeholder="Contrasena" required />
            <button type="submit">Crear cuenta</button>
            {authStatus && <p className="status">{authStatus}</p>}
            <p>
              Ya tenes cuenta? <a href="#login">Iniciar sesion</a>
            </p>
          </form>
        </section>
        {renderFooter()}
      </main>
    );
  }

  if (page === "login") {
    return (
      <main>
        <header className="authHeader">{renderNav()}</header>
        <section className="authPage">
          <form className="authForm" onSubmit={handleLogin}>
            <span className="eyebrow">Acceso a la plataforma</span>
            <h1>Iniciar sesion</h1>
            <input name="email" type="email" placeholder="Email" required />
            <input name="password" type="password" placeholder="Contrasena" required />
            <button type="submit">Entrar</button>
            {authStatus && <p className="status">{authStatus}</p>}
            <p>
              No tenes cuenta? <a href="#registrarse">Registrarse</a>
            </p>
          </form>
        </section>
        {renderFooter()}
      </main>
    );
  }

  return (
    <main>
      <header className="hero" id="inicio">
        {renderNav()}

        <section className="heroContent">
          <div>
            <span className="eyebrow">Formacion tecnica online</span>
            <h1>Cursos practicos para aprender mecanica automotriz desde cero.</h1>
            <p>
              Una plataforma clara y profesional para publicar videoclases, organizar
              modulos, gestionar alumnos y compartir material complementario.
            </p>
            <a className="primaryAction" href="#cursos">
              Ver cursos disponibles
            </a>
            {currentUser && (
              <p className="sessionMessage">
                Sesion iniciada como {currentUser.name}. Ya podes inscribirte a un curso.
              </p>
            )}
          </div>
        </section>
      </header>

      <section className="sectionIntro" id="cursos">
        <div>
          <span className="eyebrow">Catalogo</span>
          <h2>Cursos organizados por nivel</h2>
        </div>
        <p>
          Cada curso muestra duracion, precio, objetivos y modulos para que el alumno
          pueda elegir con informacion clara antes de inscribirse.
        </p>
      </section>

      <section className="courseGrid" aria-label="Cursos disponibles">
        {courses.map((course) => (
          <article className="courseCard" key={course.id}>
            <img src={course.image} alt={`Imagen del curso ${course.title}`} />
            <div className="courseBody">
              <div className="courseMeta">
                <span>{course.category}</span>
                <span>{course.level}</span>
              </div>
              <h3>{course.title}</h3>
              <p>{course.description}</p>
              <div className="courseFooter">
                <strong>{money(course.price)}</strong>
                <span>{course.duration}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedCourseId(course.id);
                  window.location.hash = "vista-previa";
                }}
              >
                Ver modulos
              </button>
            </div>
          </article>
        ))}
      </section>

      <section className="detailBand" id="vista-previa">
        <div className="modulePanel">
          <span className="eyebrow">Vista previa del curso</span>
          <h2>{selectedCourse?.title}</h2>
          <p>
            Temas principales que se trabajan en este curso. El contenido completo se
            desbloquea desde Mis modulos una vez abonado.
          </p>
          <ul>
            {selectedCourse?.modules.map((module, index) => (
              <li key={module}>
                <strong>Tema {index + 1}</strong>
                <span>{module}</span>
              </li>
            ))}
          </ul>
        </div>

        <form className="formPanel" id="inscripcion" onSubmit={handleEnrollment}>
          <span className="eyebrow">Inscripcion</span>
          <h2>Reserva tu lugar</h2>
          <input name="name" placeholder="Nombre completo" required />
          <input name="email" type="email" placeholder="Email" required />
          <input name="phone" placeholder="Telefono" />
          <select name="courseId" value={selectedCourseId} onChange={(event) => setSelectedCourseId(event.target.value)}>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
          <button type="submit">Enviar inscripcion</button>
          {enrollmentStatus && <p className="status">{enrollmentStatus}</p>}
        </form>
      </section>

      {isAdmin(currentUser) && (
        <section className="adminPreview">
          <div>
            <span className="eyebrow">Panel del instructor</span>
            <h2>Gestion simple del contenido</h2>
          </div>
          <div className="featureList">
            <span>Cursos</span>
            <span>Videoclases</span>
            <span>Alumnos</span>
            <span>Material PDF</span>
          </div>
        </section>
      )}

      <section className="contactBand" id="contacto">
        <div>
          <span className="eyebrow">Consultas</span>
          <h2>Contacto directo con interesados</h2>
          <p>
            Este formulario permite centralizar preguntas de alumnos y futuros
            clientes sin depender solo de redes sociales.
          </p>
        </div>
        <form className="contactForm" onSubmit={handleContact}>
          <input name="name" defaultValue={currentUser?.name || ""} placeholder="Nombre" required />
          <input
            name="email"
            type="email"
            defaultValue={currentUser?.email || ""}
            placeholder="Email"
            required
          />
          <textarea name="message" placeholder="Consulta" rows="5" required />
          <button type="submit">Enviar consulta</button>
          {contactStatus && <p className="status">{contactStatus}</p>}
        </form>
        <div className="forumPanel">
          <div className="studentsHeader">
            <div>
              <span className="eyebrow">Foro</span>
              <h2>Preguntas y respuestas</h2>
            </div>
            <button type="button" onClick={() => loadContactMessages("all")}>
              Actualizar foro
            </button>
          </div>

          {contactMessages.length === 0 ? (
            <p className="emptyState">Todavia no hay preguntas publicadas.</p>
          ) : (
            <div className="messageList">
              {contactMessages.map((message) => (
                <article className="messageCard" key={message.id}>
                  <span className="eyebrow">{message.answer ? "Respondida" : "Pendiente"}</span>
                  <h3>{message.message}</h3>
                  <p>
                    Pregunto <strong>{message.name}</strong>
                  </p>
                  {message.answer ? (
                    <div className="answerBox">
                      <strong>Respuesta del instructor</strong>
                      <p>{message.answer}</p>
                    </div>
                  ) : (
                    <p>El instructor todavia no respondio esta consulta.</p>
                  )}

                  {isAdmin(currentUser) && (
                    <form
                      className="answerForm"
                      onSubmit={(event) => handleContactAnswer(event, message.id)}
                    >
                      <textarea
                        name="answer"
                        defaultValue={message.answer}
                        placeholder="Responder desde el foro"
                        rows="3"
                        required
                      />
                      <button type="submit">Responder</button>
                    </form>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
      {renderFooter()}
    </main>
  );
}

export default App;
