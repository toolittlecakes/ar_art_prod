#!/usr/bin/env node
/**
 * Normalize all GLB models in assets/models to fit within a 1x1x1 bounding box.
 * Usage: node normalize-models.mjs
 */

import { NodeIO } from '@gltf-transform/core';
import { getBounds, transformMesh, center } from '@gltf-transform/functions';
import { readdirSync, existsSync, mkdirSync } from 'fs';
import { join, basename } from 'path';
import { mat4 } from 'gl-matrix';

const MODELS_DIR = './assets/models';
const OUTPUT_DIR = './assets/models'; // overwrite in place, or change to './assets/models_normalized'

async function normalizeModel(inputPath, outputPath) {
    const io = new NodeIO();
    const document = await io.read(inputPath);

    // Get the scene bounds
    const scene = document.getRoot().listScenes()[0];
    if (!scene) {
        console.log(`  ⚠️  No scene found in ${basename(inputPath)}, skipping`);
        return;
    }

    const bounds = getBounds(scene);
    const min = bounds.min;
    const max = bounds.max;

    // Calculate dimensions
    const sizeX = max[0] - min[0];
    const sizeY = max[1] - min[1];
    const sizeZ = max[2] - min[2];
    const maxDimension = Math.max(sizeX, sizeY, sizeZ);

    if (maxDimension === 0) {
        console.log(`  ⚠️  Zero-size model in ${basename(inputPath)}, skipping`);
        return;
    }

    // Calculate scale factor to fit in 1x1x1 box
    const scaleFactor = 1.0 / maxDimension;

    console.log(`  📐 Original size: ${sizeX.toFixed(3)} x ${sizeY.toFixed(3)} x ${sizeZ.toFixed(3)}`);
    console.log(`  📏 Max dimension: ${maxDimension.toFixed(3)}, scale factor: ${scaleFactor.toFixed(4)}`);

    // Apply scaling to all meshes
    const meshes = document.getRoot().listMeshes();
    const scaleMatrix = mat4.fromScaling(mat4.create(), [scaleFactor, scaleFactor, scaleFactor]);

    for (const mesh of meshes) {
        transformMesh(mesh, scaleMatrix);
    }

    // Center the model after scaling
    await document.transform(center({ pivot: 'center' }));

    // Write output
    await io.write(outputPath, document);

    // Verify new bounds
    const newBounds = getBounds(scene);
    const newSizeX = newBounds.max[0] - newBounds.min[0];
    const newSizeY = newBounds.max[1] - newBounds.min[1];
    const newSizeZ = newBounds.max[2] - newBounds.min[2];
    console.log(`  ✅ New size: ${newSizeX.toFixed(3)} x ${newSizeY.toFixed(3)} x ${newSizeZ.toFixed(3)}`);
}

async function main() {
    console.log('🔧 Normalizing models to fit 1x1x1 bounding box...\n');

    const files = readdirSync(MODELS_DIR).filter(f => f.endsWith('.glb'));

    if (files.length === 0) {
        console.log('No .glb files found in', MODELS_DIR);
        return;
    }

    console.log(`Found ${files.length} GLB files:\n`);

    for (const file of files) {
        const inputPath = join(MODELS_DIR, file);
        const outputPath = join(OUTPUT_DIR, file);

        console.log(`📦 Processing: ${file}`);
        try {
            await normalizeModel(inputPath, outputPath);
        } catch (err) {
            console.error(`  ❌ Error processing ${file}:`, err.message);
        }
        console.log('');
    }

    console.log('✨ Done!');
}

main().catch(console.error);
