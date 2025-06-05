<script setup>
import ChatEmpty from "./chat-empty.vue";
</script>

<template>
  <chat-empty v-if="!showChatLogs.length" />

  <div class="pa-4">
    <template v-for="it in showChatLogs" :key="it.id">
      <msg-item
        v-if="it.model"
        :info="it"
        :modelId="it.model"
        :logs="getLogs(it)"
      />
      <msg-sent v-else :rowId="it.id" :modelId="it.model" :text="it.content" />
    </template>
  </div>
</template>

<script>
import md5 from "md5";
import { mapGetters, mapState } from "vuex";

export default {
  data() {
    return {};
  },
  computed: {
    ...mapState({
      aiModels: (s) => s.aiModels,
      checkModelIds: (s) => s.checkModelIds,
      chatLogs: (s) => s.chatLogs,
      apiKey: (s) => s.apiKey,
    }),
    ...mapGetters(["chatMenu"]),
    path() {
      return this.$route.path;
    },
    menuId() {
      if (this.path != "/") return null;
      return this.chatMenu?.id;
    },
    checkModels() {
      return this.checkModelIds
        .map((id) => {
          return this.aiModels.find((it) => it.id == id);
        })
        .filter((it) => !!it);
    },
    showChatLogs() {
      return this.chatLogs.filter((it) => {
        if (it.model) {
          return this.checkModelIds.includes(it.model);
        }
        return true;
      });
    },
  },
  watch: {
    chatLogs() {
      this.storeLogs();
    },
    async menuId() {
      this.setLogs();
    },
  },
  created() {
    this.$bus.on("send-msg", (msg) => {
      console.log(msg);
      this.onSendMsg(msg);
    });
    this.setLogs()
  },
  unmounted() {
    this.$bus.off("send-msg");
  },
  methods: {
    async setLogs() {
      const menuId = this.menuId;
      let data = await localforage.getItem("chat-" + menuId);
      if (menuId != this.menuId) return;
      if (data) {
        data = JSON.parse(data);
      }
      if (!data) data = [];
      this.inRestore = true;
      this.$setStore({
        chatLogs: data,
      });
      this.$bus.emit("chat-to-btm");
    },
    storeLogs() {
      if (this.inRestore) {
        this.inRestore = false;
        return;
      }
      const data = JSON.stringify(this.chatLogs);
      localforage.setItem("chat-" + this.menuId, data);
    },
    getMsgId(mm = "") {
      const rand = (Math.random() + "").substring(0, 4);
      return "msg-" + md5(Date.now() + rand + mm).substring(0, 8);
    },
    updateTitle(title) {
      this.$store.commit("updateChatMenu", {
        title,
      });
    },
    onSendMsg(content) {
      const id = this.getMsgId();
      const list = [
        {
          content,
          id,
          createAt: Date.now(),
        },
      ];
      const jobModelIds = [];
      const isExpand = this.checkModels.length == 1;
      for (const row of this.checkModels) {
        jobModelIds.push(row.id);
        list.push({
          con_id: id,
          id: this.getMsgId(row.id),
          model: row.id,
          createAt: Date.now() + 10,
          expand: isExpand,
        });
      }
      const chatLogs = [...this.chatLogs, ...list];
      if (chatLogs.length > 50) {
        //
      }
      if (!this.chatMenu.title) {
        this.updateTitle(content);
      }
      this.$setStore({
        chatLogs,
      });
      this.$setState({
        jobModelIds,
      });
      this.$bus.emit("chat-to-btm", true);
    },
    getLogs(it) {
      // const msgRow = this.chatLogs.find((log) => log.id == it.con_id);
      // if (msgRow) return [msgRow.content];
      return this.chatLogs
        .filter((log) => {
          return (
            (!log.model || it.model == log.model) && log.createAt < it.createAt
          );
        })
        .slice(-20)
        .map((it) => {
          return {
            role: !it.model ? "user" : "assistant",
            content: it.content,
          };
        });
    },
  },
};
</script>
