<template>
  <div class="al-c">
    <q-btn
      :class="{
        'ml-3': i > 0,
      }"
      flat
      dense
      v-for="(it, i) in list"
      :key="it.icon"
      @click="onAct(it)"
    >
      <img :src="`/img/${it.icon}.svg`" width="22" />
      <q-tooltip>
        {{ it.tip }}
      </q-tooltip>
    </q-btn>
  </div>

  <div class="d-n">
    <input
      ref="file"
      type="file"
      accept="application/json"
      @input="onUploadFile"
    />
  </div>
</template>

<script>
import md5 from "md5";
import { mapGetters, mapState } from "vuex";

export default {
  computed: {
    ...mapState(["chatMenus", "chatLogs"]),
    ...mapGetters(["chatMenu"]),
  },
  data() {
    return {
      list: [
        {
          icon: "ic-download",
          name: "download",
          tip: "Export chat",
        },
        {
          icon: "ic-upload",
          name: "upload",
          tip: "Import chat",
        },
      ],
    };
  },
  methods: {
    onAct({ name }) {
      if (name == "download") {
        this.doDownload();
      } else if (name == "upload") {
        this.$refs.file.click();
      }
    },
    doDownload() {
      const json = JSON.stringify(
        {
          ...this.chatMenu,
          time: Date.now(),
          logs: this.chatLogs,
        },
        null,
        "  "
      );
      const name = "4ever-chat " + new Date().format("date");
      window.download(json, name + ".json", "application/json");
    },
    onUploadFile(e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target.result; // 读取到的文件内容
        this.setConfig(content);
      };
      reader.readAsText(file);
    },
    setConfig(content) {
      try {
        const { logs, ...menu } = JSON.parse(content);
        if (!Array.isArray(logs) || !menu.id) {
          throw new Error("Unsupported config");
        }
        menu.id = menu.id + "-" + md5(Date.now()).substring(0, 4);
        this.$setStore({
          chatMenus: [menu, ...this.chatMenus],
          menuIdx: 0,
        });
        setTimeout(() => {
          this.$setStore({
            chatLogs: logs,
          });
        }, 100);
      } catch (error) {
        window.$toast(error.message);
      }
    },
  },
};
</script>