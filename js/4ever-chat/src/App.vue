<template>
  <router-view />
</template>

<script>
import { useQuasar } from "quasar";
import { SSE } from "sse";
import MarkdownIt from "markdown-it/lib";
import Highlight from "markdown-it-highlightjs";
// import "highlight.js";

window.SSE = SSE;

window.markdownIt = MarkdownIt({
  linkify: true,
  breaks: true,
}).use(Highlight);

export default {
  name: "App",
  setup() {
    const $q = useQuasar();
    window.$q = $q;

    window.$loading = (opts) => {
      if (typeof opts == "string") {
        opts = {
          message: opts,
        };
      }
      $q.loading.show(opts);
    };
    window.$loadingClose = (group) => {
      $q.loading.hide(group);
    };
    window.$toast = (message, opts = "warning") => {
      if (opts > 0) {
        opts = ["positive", "negative", "warning", "info", "ongoing"][opts - 1];
        if (!opts) opts = "positive";
      }
      if (typeof opts == "string") {
        opts = {
          type: opts, //
        };
      }
      $q.notify({
        message,
        timeout: 1200,
        position: "top",
        ...opts,
      });
    };
    window.$alert = (message, opts = {}) => {
      return new Promise((resolve) => {
        $q.dialog({
          title: "Tip",
          color: "primary",
          message,
          transitionShow: "jump-up",
          transitionHide: "jump-up",
          ...opts,
        })
          .onOk(resolve)
          .onDismiss(resolve);
      });
    };
    window.$confirm = (message, opts = {}) => {
      if (opts.okLabel) {
        opts.ok = {
          label: opts.okLabel,
          color: "primary",
          flat: false,
        };
      }
      return new Promise((resolve, reject) => {
        $q.dialog({
          title: "Notice",
          color: "primary",
          message,
          cancel: true,
          persistent: true,
          ...opts,
        })
          .onOk(resolve)
          .onCancel(reject);
      });
    };
    window.$prompt = (title, opts = {}) => {
      return window.$confirm(opts.msg || "", {
        title,
        color: "primary",
        prompt: {
          model: opts.value || "",
          type: "text", // optional
        },
        ...opts,
      });
    };
  },
};
</script>
