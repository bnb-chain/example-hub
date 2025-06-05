<style lang="scss">
.msg-sent-con {
  border-top-right-radius: 0;
}
</style>

<template>
  <div class="d-flex f-end hover-wrap">
    <div class="mr-2 ta-r">
      <!-- <div class="fz-14 op-6 mb-1">{{ userInfo.uname }}</div> -->
      <div class="d-flex f-end">
        <div>
          <q-btn icon="cached" size="sm" dense flat @click="onRefresh"></q-btn>
        </div>
        <div class="msg-sent-con bg-left px-3 py-2 bdrs-8 fz-15 ta-l">
          <div v-html="html"></div>
        </div>
      </div>
      <div class="mt-1 gray hover-show al-c f-end">
        <div class="fz-12 al-c hover-1" @click="onCopyCode">
          <img src="/img/ic-code.svg" width="14" />
          <span class="ml-1">{{ codeCopied ? "Copied" : "Copy Code" }}</span>
        </div>
        <img
          src="/img/ic-copy.svg"
          width="14"
          class="hover-1 ml-2"
          @click="$copy(text)"
        />
        <img
          src="/img/ic-delete.svg"
          width="14"
          class="hover-1 ml-2"
          @click="onDel"
        />
      </div>
    </div>

    <!-- <div>
      <jazz-icon :hash="userInfo.uid" />
    </div> -->
  </div>
</template>

<script>
import { mapState } from "vuex";

const { VITE_AI_URL } = import.meta.env;

export default {
  props: {
    rowId: String,
    modelId: String,
    text: String,
  },
  computed: {
    ...mapState({
      userInfo: (s) => s.userInfo,
      apiKey: (s) => s.apiKey,
    }),
    html() {
      return this.text.replace(/\n/g, "<br>");
    },
  },
  data() {
    return {
      codeCopied: false,
    };
  },
  methods: {
    onRefresh() {
      this.$bus.emit("refresh-chat", this.rowId);
    },
    async onDel() {
      try {
        // await this.$confirm("Are you sure to delete this message?");
        this.$store.commit("updateChatLog", {
          id: this.rowId,
          content: "del-" + this.text,
          _delete: true,
        });
      } catch (error) {
        console.log(error);
      }
    },
    onCopyCode() {
      let model = "openai/gpt-3.5-turbo";
      const msg = `fetch("${VITE_AI_URL}/chat/completions", {
  method: "POST",
  headers: {
    "Authorization": "Bearer ${this.apiKey}",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    "model": "${model}",
    "messages": [
      {"role": "user", "content": "${this.text}"},
    ],
  })
});`;
      this.$copy(msg, "Code Copied");
      // this.codeCopied = true;
    },
  },
};
</script>