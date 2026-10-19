# FurnitureDataViz (`SheetCraft 3D`)

**Universal Google Sheets-Powered Parametric 3D Furniture, Cabinet, Table & Railing CAD Studio**  
**GitHub Repository:** [https://github.com/narekmartiros/FurnitureDataViz](https://github.com/narekmartiros/FurnitureDataViz)

> **Alternative Repository Name Suggestions:**
> - `FurnitureDataViz` *(configured default)*
> - `SheetCraft3D` *(highlights the live Google Sheets → 3D woodworking CAD workflow)*
> - `ParametricJoineryStudio` *(emphasizes parametric cut-lists, joinery, and hardware kinematics)*
> - `CutListCAD` *(short, punchy, and developer/maker friendly)*

---

## 1. Architecture Overview (Option A: Unified TypeScript Monorepo)

```
FurnitureDataViz/
├── .github/workflows/ci.yml           # Automated Test, Typecheck & Build CI
├── apps/
│   ├── web/                           # Next.js 15 + React 19 + Three.js (R3F) Daylight CAD Studio
│   ├── mobile/                        # Expo (React Native) iOS & Android Workshop Companion
│   └── api/                           # Fastify + Prisma PostgreSQL + Google OAuth2 & Sheets API v4
├── packages/
│   ├── parametric-engine/             # 100% Shared Core: Formula AST, Schema Mapper, Cabinet & Table 3D Topologies, GTV/Blum Kinematics, 2D Nesting & 5-Rule Audit
│   └── ui-tokens/                     # Architectural Daylight (Light) Theme Design System Tokens
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── push_to_github.sh                  # One-command push to github.com/narekmartiros/FurnitureDataViz
```

## 2. Supported 3D Topology Templates

1. **`CABINET_CARGO_PULLOUT` (`Petrovka_construction — Sheet20`)**:
   - 20×20 mm tubular steel perimeter frame (`265 × 680 × 570 mm`), inset 18 mm birch/oak carcass panels, 2-tier pull-out cargo drawer tower, 2.5 mm reveal facade, and interactive GTV Meridian 500 mm ball-bearing slides with System-32 drilling coordinates.
2. **`CABINET_MULTI_DRAWER` (Workshop / Kitchen 3-Drawer Base Cabinet)**:
   - Modular multi-drawer base carcass (`600 × 820 × 570 mm`) with 3 independent drawer boxes, configurable GTV/Blum/Hettich slides per drawer tier, and System-32 side-wall hole generation.
3. **`TABLE_WORKBENCH_DRAWER` (Steel-Frame Workbench & Dining Table with Aprons, Lower Shelf & Under-Top Drawer)**:
   - Parametric tabletop (`1600 × 800 × 25 mm`) with configurable overhang (`30 mm`), 40×40 mm steel legs, structural front/back/side aprons, lower stretcher storage shelf, and a center under-top pull-out utility drawer mounted on GTV ball-bearing slides.

## 3. Quick Start & Pushing to GitHub

```bash
# 1. Unzip and enter repository
unzip FurnitureDataViz.zip -d FurnitureDataViz
cd FurnitureDataViz

# 2. Push pre-initialized Git history directly to your GitHub
chmod +x push_to_github.sh
./push_to_github.sh

# 3. Install workspace dependencies & start development servers
pnpm install
cp apps/api/.env.example apps/api/.env
pnpm dev
```
