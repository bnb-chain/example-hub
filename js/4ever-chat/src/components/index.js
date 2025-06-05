const files = import.meta.globEager("/src/components/*/*.vue");

export default {
  install(app) {
    const list = Object.keys(files);
    list.forEach((filePath) => {
      const component = files[filePath].default;
      let { name } = component;
      if (!name) {
        name = filePath
          .replace(/\/index.vue$/, "")
          .replace(/^.*\//, "")
          .replace(".vue", "");
      }
      app.component(name, component);
    });
  },
};
