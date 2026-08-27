"""
Calibrador de Cajones para Cámara Cenital — Smart Park
Adaptado de tu Traffic Signal Violation (tkinter + object_detection + cv2)
Uso: python tools/parking_tkinter_calibrator.py
  1. Archivo -> Abrir Foto/Video (foto cenital del playón)
  2. Analizar -> Definir Cajones (4 clics por cajón, repite)
  3. Analizar -> Detectar Ocupación (usa tu object_detection YOLO)
  4. Archivo -> Sincronizar al Servidor (sube cajones a POST /parkings/{id}/floor-plan/sync)

Requiere: pip install pillow opencv-python imageio
  object_detection.py debe exponer detect(image) -> [[x1,y1,x2,y2,conf,cls], ...]
"""
from tkinter import *
from PIL import Image, ImageTk
from tkinter import filedialog
import cv2
import requests

try:
    import object_detection as od
    HAS_OD = True
except ImportError:
    HAS_OD = False
    print("[aviso] object_detection no encontrado — usará contornos OpenCV como fallback")

API_BASE = "http://127.0.0.1:8000/api/v1"
DEFAULT_PARKING_ID = 1  # cambia al ID de tu cochera (ver GET /parkings)

class Window(Frame):
    def __init__(self, master=None):
        Frame.__init__(self, master)
        self.master = master
        self.slots = []
        self.current_poly = []
        self.master.title("Smart Park - Calibrador de Cajones (Cámara Cenital)")
        self.pack(fill=BOTH, expand=1)
        menu = Menu(self.master)
        self.master.config(menu=menu)
        file = Menu(menu)
        file.add_command(label="Abrir Foto/Video", command=self.open_file)
        file.add_command(label="Sincronizar al Servidor", command=self.sync_to_server)
        file.add_command(label="Salir", command=self.client_exit)
        menu.add_cascade(label="Archivo", menu=file)
        analyze = Menu(menu)
        analyze.add_command(label="Definir Cajones (4 clics = 1 cajón)", command=self.defineSlots)
        analyze.add_command(label="Detectar Ocupación", command=self.detectOccupancy)
        analyze.add_command(label="Limpiar Cajones", command=self.clearSlots)
        menu.add_cascade(label="Analizar", menu=analyze)
        self.filename = None
        self.image_cv = None
        self.tkimage = None
        self.w, self.h = (1366, 768)
        self.canvas = Canvas(master=root, width=self.w, height=self.h, bg="#0f172a")
        self.canvas.pack()
        self.canvas.create_text(683, 384, text="Abre una foto cenital (Archivo -> Abrir)", fill="#94a3b8", font=("Arial", 14))

    def open_file(self):
        path = filedialog.askopenfilename(filetypes=[("Imágenes/Videos","*.jpg *.jpeg *.png *.mp4 *.avi *.mov")])
        if not path: return
        self.filename = path
        if path.lower().endswith(('.mp4','.avi','.mov')):
            cap = cv2.VideoCapture(path)
            ret, frame = cap.read()
            if ret: self.image_cv = frame
        else:
            self.image_cv = cv2.imread(path)
        self.show_image()

    def show_image(self):
        if self.image_cv is None: return
        # Convertir BGR (cv2) a RGB para PIL
        img_rgb = cv2.cvtColor(self.image_cv, cv2.COLOR_BGR2RGB)
        pil = Image.fromarray(img_rgb)
        pil.thumbnail((1300, 700))
        self.tkimage = ImageTk.PhotoImage(pil)
        self.canvas.delete("all")
        self.canvas.create_image(0, 0, image=self.tkimage, anchor='nw')
        for poly in self.slots:
            pts = [c for p in poly for c in p]
            self.canvas.create_polygon(pts, outline='#10B981', width=2)

    def defineSlots(self):
        self.current_poly = []
        root.config(cursor="plus")
        self.canvas.bind("<Button-1>", self.on_click_slot)
        print("Modo definir cajones: 4 clics por cajón. Cada 4 clics cierra un cajón.")

    def on_click_slot(self, event):
        self.current_poly.append((event.x, event.y))
        self.canvas.create_oval(event.x-3, event.y-3, event.x+3, event.y+3, fill='#10B981', outline='')
        if len(self.current_poly) == 4:
            pts = [c for p in self.current_poly for c in p]
            self.canvas.create_polygon(pts, outline='#10B981', width=2)
            self.slots.append(list(self.current_poly))
            print(f"Cajón {len(self.slots)}: {self.current_poly}")
            self.current_poly = []

    def clearSlots(self):
        self.slots = []
        self.show_image()

    def detectOccupancy(self):
        if not self.slots:
            print("Define al menos 1 cajón primero.")
            return
        if self.image_cv is None:
            print("Abre una imagen primero.")
            return
        # Detección
        detections = []
        if HAS_OD:
            try:
                # Intenta API común de tu object_detection
                if hasattr(od, 'detect'):
                    detections = od.detect(self.image_cv) or []
                elif hasattr(od, 'object_detection'):
                    detections = od.object_detection(self.image_cv) or []
                else:
                    detections = []
            except Exception as e:
                print(f"object_detection falló, usando fallback contornos: {e}")
                detections = self._fallback_boxes()
        else:
            detections = self._fallback_boxes()

        occupied = 0
        for idx, poly in enumerate(self.slots, 1):
            cx = sum(p[0] for p in poly) / 4
            cy = sum(p[1] for p in poly) / 4
            is_occ = False
            for det in detections:
                try:
                    x1, y1, x2, y2 = map(int, det[:4])
                    if x1 <= cx <= x2 and y1 <= cy <= y2:
                        is_occ = True
                        break
                except: continue
            color = '#EF4444' if is_occ else '#10B981'
            label = 'OCUPADO' if is_occ else 'LIBRE'
            pts = [c for p in poly for c in p]
            self.canvas.create_polygon(pts, outline=color, width=3)
            self.canvas.create_text(sum(p[0] for p in poly)/4, sum(p[1] for p in poly)/4, text=f"{idx}:{label}", fill=color, font=("Arial", 9, "bold"))
            if is_occ: occupied += 1
        print(f"Resultado: {occupied}/{len(self.slots)} ocupados. Libre: {len(self.slots)-occupied}")

    def _fallback_boxes(self):
        # Contornos simples si no hay YOLO: detecta manchas oscuras como autos (heurística)
        gray = cv2.cvtColor(self.image_cv, cv2.COLOR_BGR2GRAY)
        _, thr = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        contours, _ = cv2.findContours(thr, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        boxes = []
        h, w = gray.shape
        for cnt in contours:
            x, y, bw, bh = cv2.boundingRect(cnt)
            area = bw*bh
            if area < w*h*0.01 or area > w*h*0.3: continue
            if 1.2 < bw/float(bh) < 4.0 and bh > 30:
                boxes.append([x, y, x+bw, y+bh, 0.5, 2])
        return boxes

    def sync_to_server(self):
        if not self.slots:
            print("No hay cajones para sincronizar.")
            return
        # Convierte polígonos (4 puntos) a slots del plano CAD (x,y,w,h)
        # Usa bounding rect como aproximación
        slots_payload = []
        for i, poly in enumerate(self.slots, 1):
            xs = [p[0] for p in poly]; ys = [p[1] for p in poly]
            x, y = min(xs), min(ys)
            w, h = max(xs)-x, max(ys)-y
            slots_payload.append({"code": f"A-{i:02d}", "floor_level": "Piso 1", "slot_type": "auto", "status": "free", "pos_x": int(x), "pos_y": int(y), "width": int(w), "height": int(h), "rotation": 0})
        import json
        print(f"Enviando {len(slots_payload)} cajones a {API_BASE}/parkings/{DEFAULT_PARKING_ID}/floor-plan/sync ...")
        # Requiere token de admin local/platform en header Authorization
        # Para prueba sin auth, usa el endpoint con token harcodeado o desactiva require_role temporalmente
        print(json.dumps(slots_payload[:2], indent=2))
        print("Copia este JSON y pégalo en el Editor Web, o implementa el POST con requests + Bearer token.")

    def client_exit(self):
        exit()

if __name__ == "__main__":
    root = Tk()
    root.geometry("1366x768")
    app = Window(root)
    root.mainloop()
