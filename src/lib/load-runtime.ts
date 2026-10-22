import { resolve } from 'node:path';
import { homedir } from 'node:os';
import { pathToFileURL } from 'node:url';
import scaffoldingPackage from '@turbowarp/scaffolding';
import type { CLIFlags } from '../types.ts';

const { Scaffolding, Packages } = scaffoldingPackage;

// Just a wrapper over import() that lets us use more path syntax.
async function importModule(specifier: string) {
  if (specifier.startsWith('~/')) {
    specifier = resolve(homedir(), specifier.slice(2));
  }

  if (specifier.startsWith('.') || specifier.startsWith('/')) {
    specifier = pathToFileURL(resolve(specifier)).href;
  }

  const module = await import(specifier);
  return module.default || module;
}

export default async function loadRuntime(
  flags: CLIFlags
) {
  // If no custom packages are needed then just load default scaffolding.
  if (!flags.vm && !flags.renderer && !flags.storage) {
    const scaffolding = new Scaffolding();
    scaffolding.setup();
    return scaffolding;
  }

  const VM = flags.vm
    ? await importModule(flags.vm)
    : Packages.VM;
  const Renderer = flags.renderer
    ? await importModule(flags.renderer)
    : Packages.Renderer;
  const Storage = flags.storage
    ? await importModule(flags.storage)
    : Packages.Storage;
  const vm: VM = new VM();
  const renderer = new Renderer(
    document.createElement('canvas'),
    -240,
    240,
    -180,
    180
  );

  // todo: do we even need this
  vm.setCompatibilityMode(true);
  vm.attachRenderer(renderer);
  vm.attachStorage(new Storage());
  vm.attachV2BitmapAdapter(new Packages.SVGRenderer.BitmapAdapter());

  // In some ways this can be considered a "stub" of scaffolding.
  return {
    vm,
    loadProject: vm.loadProject.bind(vm)
  };
}
