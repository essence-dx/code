#!/usr/bin/env python3
from __future__ import annotations

import argparse
import sys
from pathlib import Path

import bpy  # type: ignore


def parse_args() -> argparse.Namespace:
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else sys.argv[1:]
    parser = argparse.ArgumentParser(description="Convert Blender-readable exchange files to GLB for Essence Spline.")
    parser.add_argument("input", help="FBX, DAE, USD, USDC, 3DS, 3MF, OBJ, or STL source path")
    parser.add_argument("output", help="Output .glb path")
    return parser.parse_args(argv)


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()


def get_operator(namespace, label: str, *names: str):
    for name in names:
        if hasattr(namespace, name):
            return getattr(namespace, name)

    raise RuntimeError(f"{label} importer is not available in this Blender build.")


def require_operator(operator, label: str):
    if operator.poll():
        return operator

    raise RuntimeError(f"{label} importer is not available in this Blender build.")


def import_source(input_path: Path) -> None:
    extension = input_path.suffix.lower()

    if extension == ".fbx":
        require_operator(get_operator(bpy.ops.import_scene, "FBX", "fbx"), "FBX")(filepath=str(input_path))
        return

    if extension == ".dae":
        require_operator(get_operator(bpy.ops.wm, "Collada", "collada_import"), "Collada")(filepath=str(input_path))
        return

    if extension in {".usd", ".usdc"}:
        require_operator(get_operator(bpy.ops.wm, "USD", "usd_import"), "USD")(filepath=str(input_path))
        return

    if extension == ".3ds":
        require_operator(get_operator(bpy.ops.import_scene, "3DS", "autodesk_3ds"), "3DS")(filepath=str(input_path))
        return

    if extension == ".3mf":
        require_operator(get_operator(bpy.ops.import_mesh, "3MF", "three_mf"), "3MF")(filepath=str(input_path))
        return

    if extension == ".obj":
        operator = get_operator(bpy.ops.wm, "OBJ", "obj_import") if hasattr(bpy.ops.wm, "obj_import") else get_operator(bpy.ops.import_scene, "OBJ", "obj")
        require_operator(operator, "OBJ")(filepath=str(input_path))
        return

    if extension == ".stl":
        operator = get_operator(bpy.ops.wm, "STL", "stl_import") if hasattr(bpy.ops.wm, "stl_import") else get_operator(bpy.ops.import_mesh, "STL", "stl")
        require_operator(operator, "STL")(filepath=str(input_path))
        return

    raise RuntimeError(f"Unsupported exchange format: {extension}")


def export_glb(output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    bpy.ops.export_scene.gltf(filepath=str(output_path), export_format="GLB", export_apply=True)


def main() -> None:
    args = parse_args()
    input_path = Path(args.input).expanduser().resolve()
    output_path = Path(args.output).expanduser().resolve()

    if output_path.suffix.lower() != ".glb":
        raise SystemExit("Output must end in .glb.")

    clear_scene()
    import_source(input_path)
    export_glb(output_path)
    print(f"Exported {output_path}")


if __name__ == "__main__":
    main()
