# Pasos para configurar Router Outlet en el componente Admin en Angular

## 1. Crear el componente Admin

```bash
ng generate component paginas/admin
```

## 2. Configurar el archivo admin.component.ts

Importar los módulos necesarios para el enrutamiento:

```typescript
import { Component } from "@angular/core";
import { RouterLink } from "@angular/router";
import { RouterLinkActive } from "@angular/router";
import { RouterOutlet } from "@angular/router";

@Component({
  selector: "app-admin",
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: "./admin.component.html",
  styleUrl: "./admin.component.css",
})
export class AdminComponent {}
```

## 3. Configurar la plantilla HTML del componente Admin

En el archivo admin.component.html, añadir el router-outlet para mostrar los componentes hijos:

```html
<!-- Aquí puedes añadir elementos de navegación o layout para el panel admin -->
<router-outlet></router-outlet>
```

## 4. Configurar las rutas en app.routes.ts

Definir el componente Admin como padre y sus componentes hijos usando el concepto de rutas anidadas:

```typescript
import { Routes } from "@angular/router";
import { DashboardComponent } from "./paginas/admin/dashboard/dashboard.component";
import { AdminComponent } from "./paginas/admin/admin.component";
import { PageNotFoundComponent } from "./paginas/page-not-found/page-not-found.component";

export const routes: Routes = [
  {
    path: "admin",
    component: AdminComponent,
    children: [
      {
        path: "dashboard",
        component: DashboardComponent,
      },
      // Aquí puedes añadir más componentes hijos
    ],
  },
  {
    path: "",
    redirectTo: "/admin/dashboard",
    pathMatch: "full",
  },
  {
    path: "**",
    component: PageNotFoundComponent,
  },
];
```

## 5. Configurar el componente hijo (Dashboard)

Asegúrate de que el componente Dashboard esté correctamente configurado:

```typescript
import { Component } from "@angular/core";
import { RouterOutlet } from "@angular/router";

@Component({
  selector: "app-dashboard",
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: "./dashboard.component.html",
  styleUrl: "./dashboard.component.css",
})
export class DashboardComponent {}
```

Si tu componente Dashboard también necesita mostrar componentes hijos a través de rutas anidadas, debes añadir un <router-outlet> en su plantilla html:

```html
<p>dashboard works!</p>
<!-- Si necesitas mostrar componentes hijos dentro del dashboard -->
<router-outlet></router-outlet>
```

Es importante importar RouterOutlet en el Dashboard por dos razones:

1. Para permitir que el Dashboard muestre sus propios componentes hijos si los tuviera
2. Para mantener consistencia con las prácticas de Angular en componentes que podrían expandirse

## 6. Verificar el funcionamiento

1. Navega a la ruta /admin/dashboard en tu aplicación
2. El componente Admin se cargará primero
3. Dentro del <router-outlet> del componente Admin, se mostrará el contenido del componente Dashboard

## Solución de problemas comunes

- Si el contenido no se muestra, verifica que las importaciones en todos los componentes sean correctas
- Asegúrate de que AdminComponent tenga RouterOutlet importado y declarado
- Confirma que las rutas estén correctamente definidas con la estructura padre-hijo
- Verifica la consola del navegador para identificar posibles errores
