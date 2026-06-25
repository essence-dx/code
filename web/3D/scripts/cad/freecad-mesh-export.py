#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path

import FreeCAD  # type: ignore
import Mesh  # type: ignore
import MeshPart  # type: ignore
import Part  # type: ignore


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Convert native CAD files to mesh formats that Essence Spline can import.")
    parser.add_argument("input", help="STEP, IGES, BREP, SAT, SAB, or 3DM source path")
    parser.add_argument("output", help="Output .stl or .obj path")
    parser.add_argument("--linear-deflection", type=float, default=0.1, help="Mesh linear deflection")
    parser.add_argument("--angular-deflection", type=float, default=0.5, help="Mesh angular deflection in radians")
    return parser.parse_args()


def load_shapes(input_path: Path):
    extension = input_path.suffix.lower()

    if extension in {".step", ".stp", ".iges", ".igs", ".brep"}:
        shape = Part.Shape()
        if extension in {".step", ".stp"}:
            shape.read(str(input_path))
        elif extension in {".iges", ".igs"}:
            shape.read(str(input_path))
        else:
            shape.importBrep(str(input_path))
        return [shape]

    document = FreeCAD.newDocument("EssenceSplineCadConvert")
    Part.insert(str(input_path), document.Name)
    return [obj.Shape for obj in document.Objects if hasattr(obj, "Shape") and not obj.Shape.isNull()]


def export_mesh(shapes, output_path: Path, linear_deflection: float, angular_deflection: float) -> None:
    if not shapes:
        raise RuntimeError("No solid or surface shapes were found in the source file.")

    meshes = [
        MeshPart.meshFromShape(
            Shape=shape,
            LinearDeflection=linear_deflection,
            AngularDeflection=angular_deflection,
            Relative=False,
        )
        for shape in shapes
    ]
    merged = Mesh.Mesh()

    for mesh in meshes:
        merged.addMesh(mesh)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    merged.write(str(output_path))


def main() -> None:
    args = parse_args()
    input_path = Path(args.input).expanduser().resolve()
    output_path = Path(args.output).expanduser().resolve()

    if output_path.suffix.lower() not in {".stl", ".obj"}:
        raise SystemExit("Output must end in .stl or .obj.")

    shapes = load_shapes(input_path)
    export_mesh(shapes, output_path, args.linear_deflection, args.angular_deflection)
    print(f"Exported {output_path}")


if __name__ == "__main__":
    main()
