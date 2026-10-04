# Sistema Genérico de Almacenamiento de Archivos

Este sistema proporciona una solución completa y reutilizable para subir, almacenar y gestionar archivos (principalmente imágenes) en cualquier entidad del sistema.

## 📦 Componentes

### Backend (Java/Spring Boot)

#### FileStorageService
Servicio principal para operaciones de archivos.

**Ubicación:** `com.dev.ultron.service.common.FileStorageService`

**Métodos:**
```java
// Almacenar un archivo en una carpeta específica
String storeFile(MultipartFile file, String folder)

// Eliminar un archivo por su ruta
void deleteFile(String filePath)

// Carpeta absoluta del servidor donde se guardan los archivos
Path getStorageLocation()
```

#### FileUploadController
Controlador REST para operaciones de archivos. Requiere token (JWT).

**Endpoints:**
- `POST /api/files/upload?folder={carpeta}` - Subir imagen (JPG, PNG, WEBP o GIF)
- `DELETE /api/files/delete?filePath={ruta}` - Eliminar archivo

#### UploadsResourceConfig
Publica la carpeta del servidor en `GET /uploads/**` (sin token). Los archivos se sirven
como recursos estáticos con `Cache-Control: max-age=31536000, public, immutable`, así que
cada cliente descarga cada imagen una sola vez.

### Dónde quedan las imágenes

**Regla:** las imágenes se guardan siempre en la PC donde corre el backend al que apunta la app,
en una carpeta de datos propia. Nunca dentro del repo del frontend, del repo del backend ni de la
carpeta de instalación del backend (`/opt/ultron`). El backend se niega a arrancar si la carpeta
configurada queda dentro de la carpeta desde la que se ejecuta.

| Entorno | Backend al que apunta la app | Carpeta de imágenes | Cómo se configura |
|---|---|---|---|
| Desarrollo | Tu PC (`localhost:8081`) | `~/ultron-uploads` (p. ej. `/home/ultron/ultron-uploads`) | Valor por defecto, no hace falta nada |
| Producción | Servidor `167.99.15.121:8081` | `/var/lib/ultron/uploads` | `ULTRON_UPLOAD_DIR=/var/lib/ultron/uploads` en `/opt/ultron/ultron.env` |
| Otro servidor | El que se configure | La que se elija, fuera de la instalación | `ULTRON_UPLOAD_DIR=<ruta absoluta>` |

**Cómo decide la app a qué servidor subir y de dónde leer:** usa la IP y el puerto del engranaje
"Configuración del Sistema" (o, si no hay nada guardado, la URL que inyecta Electron y, en último
caso, `localhost:8081`). Subida, borrado y lectura de imágenes usan esa misma dirección que GraphQL,
así que la imagen termina en la PC del backend configurado:

- Configurado `localhost` / `127.0.0.1` → se guarda en tu PC (`~/ultron-uploads`).
- Configurado `167.99.15.121` → se guarda en el servidor (`/var/lib/ultron/uploads`).

**Qué se guarda en la base:** solo la ruta relativa (`productos/<uuid>.jpg`) en `inventario.producto.imagen`.
El frontend arma la URL con la IP/puerto configurados:
`http://<servidor>:<puerto>/uploads/productos/<uuid>.jpg`. Así la base no depende de la IP
(pública o Tailscale) con la que cada PC llega al servidor, ni hay que migrar datos si cambia.

Las imágenes de un entorno no existen en el otro: una ruta cargada en la base local no se ve contra
el servidor y viceversa.

**Preparar un servidor nuevo:**

```bash
install -d -o ultron-server -g ultron-server -m 755 /var/lib/ultron/uploads
echo "ULTRON_UPLOAD_DIR=/var/lib/ultron/uploads" >> /opt/ultron/ultron.env
systemctl restart ultron
```

**Backup:** respaldar `/var/lib/ultron/uploads` junto con la base; redeployar el jar no la toca.

### Frontend (Angular)

#### FileUploadService
Servicio Angular para comunicación con el backend.

**Ubicación:** `src/app/shared/services/file-upload.service.ts`

**Métodos:**
```typescript
// Subir archivo
uploadFile(file: File, folder: string): Observable<FileUploadResponse>

// Eliminar archivo
deleteFile(filePath: string): Observable<void>

// Obtener la URL pública (http://<servidor>/uploads/<ruta>)
getFileUrl(filePath: string): string
```

#### ImageUploaderComponent
Componente standalone reutilizable para carga de imágenes.

**Ubicación:** `src/app/shared/components/image-uploader/`

**Uso:**
```html
<app-image-uploader
  [currentImagePath]="imagePath()"
  [folder]="'mi-carpeta'"
  [label]="'Mi Imagen'"
  [maxSizeMB]="5"
  [disabled]="false"
  (imageChange)="onImageChange($event)"
  (uploadError)="onImageError($event)"
/>
```

## 🚀 Cómo Implementar en un Nuevo Modelo

### Paso 1: Backend - Actualizar Entidad

```java
@Entity
@Table(name = "mi_entidad", schema = "mi_schema")
public class MiEntidad {
    // ... otros campos ...
    
    private String imagen;  // Añadir este campo
}
```

### Paso 2: Backend - Migración de Base de Datos

Crear archivo `VXX__mi_entidad_imagen.sql`:

```sql
ALTER TABLE mi_schema.mi_entidad ADD COLUMN imagen VARCHAR(500);

COMMENT ON COLUMN mi_schema.mi_entidad.imagen IS 
  'Ruta relativa de la imagen almacenada en el servidor';
```

### Paso 3: Backend - Actualizar DTOs

```java
// Input DTO
@Data
public class MiEntidadInput {
    // ... otros campos ...
    private String imagen;
}

// Output DTO
@Data
public class MiEntidadOutput {
    // ... otros campos ...
    private String imagen;
}
```

### Paso 4: Frontend - Actualizar Interfaces

```typescript
export interface MiEntidadOutput {
  // ... otros campos ...
  imagen?: string;
}

export interface MiEntidadInput {
  // ... otros campos ...
  imagen?: string;
}
```

### Paso 5: Frontend - Actualizar GraphQL

```typescript
export const MI_ENTIDAD_CRUD_CONFIG: CrudConfig = {
  selectionSet: `{
    id
    // ... otros campos ...
    imagen
  }`,
  // ...
};
```

### Paso 6: Frontend - Integrar Componente en Formulario

```typescript
import { ImageUploaderComponent } from '../../shared/components/image-uploader/image-uploader.component';

@Component({
  imports: [
    // ... otros imports ...
    ImageUploaderComponent,
  ],
  // ...
})
export class MiEntidadFormComponent {
  protected readonly imagePath = signal<string | null>(null);
  
  protected onImageChange(imagePath: string | null): void {
    this.imagePath.set(imagePath);
  }
  
  protected onImageError(error: string): void {
    console.error(error);
  }
  
  // Al guardar:
  const payload: MiEntidadInput = {
    // ... otros campos ...
    imagen: this.imagePath() || undefined,
  };
}
```

### Paso 7: Frontend - Agregar al Template

```html
<section class="form__section">
  <header class="form__section-header">
    <span class="material-icons" aria-hidden="true">image</span>
    <div>
      <h3>Imagen</h3>
      <p>Imagen representativa</p>
    </div>
  </header>

  <div class="form__grid">
    <app-image-uploader
      [currentImagePath]="imagePath()"
      [folder]="'mi-carpeta'"
      [label]="'Imagen'"
      (imageChange)="onImageChange($event)"
      (uploadError)="onImageError($event)"
    />
  </div>
</section>
```

### Paso 8: Frontend - Mostrar en Lista (Opcional)

```typescript
import { FileUploadService } from '../../shared/services/file-upload.service';

export class MiEntidadListComponent {
  protected readonly fileUploadService = inject(FileUploadService);
  
  protected readonly columns: TableColumn<MiEntidadOutput>[] = [
    { key: 'imagen', header: 'Img', width: '80px', align: 'center' },
    // ... otras columnas ...
  ];
}
```

```html
<ng-template appTableCell="imagen" let-item>
  <div class="item-imagen">
    @if (item.imagen) {
      <img [src]="fileUploadService.getFileUrl(item.imagen)" [alt]="item.nombre" />
    } @else {
      <span class="material-icons">image</span>
    }
  </div>
</ng-template>
```

## 📁 Organización de Carpetas

El sistema organiza archivos por carpetas según el tipo de entidad:

```
<ULTRON_UPLOAD_DIR>/          (dev: ~/ultron-uploads, servidor: /var/lib/ultron/uploads)
├── productos/
│   ├── abc123-def456.jpg
│   └── xyz789-uvw012.png
├── usuarios/
│   └── ...
├── vehiculos/
│   └── ...
└── documentos/
    └── ...
```

## ⚙️ Configuración

### Backend - application.properties

```properties
# Directorio de almacenamiento (dev: ~/ultron-uploads, servidor: /var/lib/ultron/uploads)
file.storage.upload-dir=${ULTRON_UPLOAD_DIR:${user.home}/ultron-uploads}

# Tamaño máximo de archivo (en bytes, 5MB)
file.storage.max-file-size=5242880

# Configuración de multipart
spring.servlet.multipart.enabled=true
spring.servlet.multipart.max-file-size=5MB
spring.servlet.multipart.max-request-size=5MB
```

### Frontend - FileUploadService

Usa la misma IP/puerto del servidor que el resto de la app (`API_CONFIG.filesEndpoint` y
`API_CONFIG.uploadsBaseUrl`, en `src/app/config/api.config.ts`). No hay URLs fijas a `localhost`.

## 🔒 Seguridad

El sistema incluye:

- ✅ Validación de tamaño de archivo
- ✅ Protección contra path traversal
- ✅ Limpieza de nombres de archivo
- ✅ Generación de nombres únicos (UUID)
- ✅ Solo imágenes JPG, PNG, WEBP o GIF (validado en frontend y backend)
- ✅ Subir y eliminar requieren token; solo la lectura de `/uploads/**` es pública

## 📝 Ejemplos de Uso

### Subir imagen de usuario

```typescript
// Frontend
<app-image-uploader
  [folder]="'usuarios'"
  (imageChange)="onImageChange($event)"
/>
```

### Subir foto de vehículo

```typescript
// Frontend
<app-image-uploader
  [folder]="'vehiculos'"
  [label]="'Foto del vehículo'"
  (imageChange)="onImageChange($event)"
/>
```

### Subir documento escaneado

```typescript
// Frontend - Necesitarías crear un FileUploaderComponent genérico
// basado en ImageUploaderComponent para aceptar otros tipos
<app-file-uploader
  [folder]="'documentos'"
  [acceptedTypes]="'application/pdf,image/*'"
  (fileChange)="onFileChange($event)"
/>
```

## 🧪 Testing

### Probar subida de archivo

```bash
curl -X POST http://localhost:8081/api/files/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@imagen.jpg" \
  -F "folder=test"
```

### Probar lectura

```bash
curl -I http://localhost:8081/uploads/test/uuid.jpg
```

## 🎨 Personalización

### Cambiar tamaño máximo

```typescript
<app-image-uploader
  [maxSizeMB]="10"  // 10MB en lugar de 5MB
/>
```

### Personalizar estilos

El componente usa clases CSS con BEM, fáciles de sobrescribir:

```scss
.image-uploader {
  &__container {
    max-width: 500px;  // Personalizar ancho
  }
  
  &__preview {
    border-radius: 50%;  // Hacer circular
  }
}
```

## 📚 Referencias

- Backend PR: #52
- Frontend PR: #72
- Implementación de referencia: Módulo de Productos

## 💡 Tips

1. **Nombres de carpeta**: Usa nombres descriptivos y en minúsculas
2. **Validación**: El frontend valida tipo y tamaño antes de subir
3. **Reutilización**: El componente es standalone, importa donde necesites
4. **Limpieza**: Considera implementar limpieza de archivos huérfanos
5. **CDN**: En producción, considera usar CDN para servir imágenes

## 🐛 Troubleshooting

### "La carpeta de imágenes ... no puede estar dentro de la carpeta de la aplicación"
- El backend no arranca porque la carpeta quedó dentro del proyecto o de `/opt/ultron`
  (por ejemplo, falta `ULTRON_UPLOAD_DIR` en el servidor, donde el home de `ultron-server` es `/opt/ultron`).
- Configurá `ULTRON_UPLOAD_DIR` con una ruta absoluta fuera de esas carpetas.

### "File size exceeds maximum"
- Verifica configuración en `application.properties`
- Aumenta `spring.servlet.multipart.max-file-size`

### "Cannot access file"
- Verifica que el usuario `ultron-server` pueda escribir en `/var/lib/ultron/uploads/`
- Asegúrate de que SecurityConfig permite `GET /uploads/**`

### Imagen no se muestra
- Verifica que el campo `imagen` viene en el GraphQL query
- Confirma que el backend retorna la ruta correcta
- Revisa la consola del navegador para errores 404
