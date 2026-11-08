#!/usr/bin/env node
import { run } from '../src/cli.js';

const code = await run(process.argv.slice(2));
process.exitCode = code; // pas de process.exit : sous Windows, couper des sockets encore ouvertes (déploiement) fait planter Node à la sortie
