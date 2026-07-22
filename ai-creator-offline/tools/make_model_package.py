#!/usr/bin/env python3
"""Prepara un pacchetto modello importabile da AI Creator Offline.

Prende la cartella di file convertiti (l'output di convert.py di MediaPipe,
la cartella dei .bin) e la impacchetta nella struttura che il Model Manager
dell'app si aspetta, generando un manifest.json con il checksum corretto.

Il checksum è calcolato ESATTAMENTE come fa l'app
(ai-creator-offline/app/.../data/local/files/ChecksumUtil.kt →
sha256Directory con esclusione del manifest): per ogni file, in ordine di
percorso relativo con separatore '/', si aggiorna un unico digest SHA-256
con <percorso relativo> + <sha256 esadecimale del file>. Il file manifest.json
è escluso dal calcolo (non può contenere la propria impronta).

Uso tipico:

    python make_model_package.py \
        --model-dir ./bins \
        --out ./SD15Mobile \
        --id sd15-mobile \
        --name "Stable Diffusion 1.5 (mobile)" \
        --min-ram-mb 6000 \
        --recommended-resolution 512 \
        --max-steps 20

Risultato: una cartella ./SD15Mobile/ con dentro model/ (i file convertiti)
e manifest.json. Quella cartella è ciò che selezioni in
Modelli → "Importa modello da cartella" nell'app.
"""

import argparse
import hashlib
import json
import os
import shutil
import sys

MANIFEST_NAME = "manifest.json"
MODEL_SUBDIR = "model"
BUFFER_SIZE = 8192


def sha256_file(path):
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        while True:
            chunk = handle.read(BUFFER_SIZE)
            if not chunk:
                break
            digest.update(chunk)
    return digest.hexdigest()


def sha256_directory(directory, exclude_names):
    """Replica ChecksumUtil.sha256Directory dell'app (con esclusioni)."""
    entries = []
    for root, _dirs, files in os.walk(directory):
        for filename in files:
            if filename in exclude_names:
                continue
            full = os.path.join(root, filename)
            rel = os.path.relpath(full, directory).replace(os.sep, "/")
            entries.append((rel, full))
    entries.sort(key=lambda item: item[0])

    digest = hashlib.sha256()
    for rel, full in entries:
        digest.update(rel.encode("utf-8"))
        digest.update(sha256_file(full).encode("utf-8"))
    return digest.hexdigest()


def directory_size_bytes(directory):
    total = 0
    for root, _dirs, files in os.walk(directory):
        for filename in files:
            total += os.path.getsize(os.path.join(root, filename))
    return total


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--model-dir", required=True, help="Cartella con i file del modello convertito (es. l'output di convert.py)")
    parser.add_argument("--out", required=True, help="Cartella pacchetto da creare")
    parser.add_argument("--id", required=True, help="ID univoco del modello (es. sd15-mobile)")
    parser.add_argument("--name", required=True, help="Nome visualizzato nell'app")
    parser.add_argument("--engine", default="mediapipe-image-generator", help="Motore (default: mediapipe-image-generator)")
    parser.add_argument("--min-ram-mb", type=int, required=True, help="RAM minima consigliata in MB")
    parser.add_argument("--recommended-resolution", type=int, default=512)
    parser.add_argument("--max-steps", type=int, default=20)
    parser.add_argument("--version", default="1.0.0")
    parser.add_argument("--license", default=None, help="Testo licenza o riferimento a LICENSE.txt")
    parser.add_argument("--supports-lora", action="store_true", help="Dichiara che il modello supporta LoRA")
    parser.add_argument("--notes", default=None)
    parser.add_argument("--preview", default=None, help="Percorso opzionale a un'immagine di anteprima (copiata come preview.jpg)")
    args = parser.parse_args()

    if not os.path.isdir(args.model_dir):
        print(f"ERRORE: --model-dir non è una cartella: {args.model_dir}", file=sys.stderr)
        return 1
    if os.path.exists(args.out):
        print(f"ERRORE: la cartella di destinazione esiste già: {args.out}\n"
              f"Rimuovila o scegli un altro --out.", file=sys.stderr)
        return 1

    model_dst = os.path.join(args.out, MODEL_SUBDIR)
    print(f"Copio i file del modello in {model_dst} ...")
    shutil.copytree(args.model_dir, model_dst)

    if args.preview:
        if not os.path.isfile(args.preview):
            print(f"ERRORE: --preview non è un file: {args.preview}", file=sys.stderr)
            return 1
        shutil.copyfile(args.preview, os.path.join(args.out, "preview.jpg"))

    print("Calcolo il checksum del pacchetto (stesso algoritmo dell'app) ...")
    checksum = sha256_directory(args.out, exclude_names={MANIFEST_NAME})
    size_bytes = directory_size_bytes(args.out)

    manifest = {
        "id": args.id,
        "displayName": args.name,
        "version": args.version,
        "engine": args.engine,
        "sizeBytes": size_bytes,
        "minRamMb": args.min_ram_mb,
        "recommendedResolution": args.recommended_resolution,
        "maxSteps": args.max_steps,
        "checksumSha256": checksum,
        "supportsLora": bool(args.supports_lora),
    }
    if args.license is not None:
        manifest["license"] = args.license
    if args.notes is not None:
        manifest["notes"] = args.notes

    manifest_path = os.path.join(args.out, MANIFEST_NAME)
    with open(manifest_path, "w", encoding="utf-8") as handle:
        json.dump(manifest, handle, indent=2, ensure_ascii=False)

    print()
    print("Pacchetto pronto:")
    print(f"  Cartella:  {os.path.abspath(args.out)}")
    print(f"  Dimensione: {size_bytes / (1024 * 1024):.1f} MB")
    print(f"  Checksum:   {checksum}")
    print()
    print("Ora copiala sul telefono e importala da: Modelli → Importa modello da cartella.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
