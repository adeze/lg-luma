import vm from 'node:vm';

// Assign inside the VM: Bun does not update declared bindings through sandbox properties.
export function override(context, values) {
  context.__overrides = values;
  vm.runInContext(
    Object.keys(values)
      .map((name) => `${name} = globalThis.__overrides[${JSON.stringify(name)}]`)
      .join(';'),
    context,
  );
  delete context.__overrides;
}
