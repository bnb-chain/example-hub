<style lang="scss">
.bg-input {
  background: #f1f5f9;
}
.q-textarea.q-field--dense .q-field__native {
  min-height: 40px;
  padding-top: 11px;
}
.chat-input {
  textarea {
    max-height: 200px;
    &::-webkit-input-placeholder {
      color: #94a3b8;
    }
  }
  .send-btn {
    transform: scale(0.86);
  }
  .q-field--outlined .q-field__control {
    padding-right: 6px;
    &::before,
    &::after {
      border: none !important;
    }
  }
  .q-field__append {
    margin-top: auto;
  }
}
</style>

<template>
  <div class="chat-input px-2 d-flex al-end">
    <q-btn
      :disable="!chatLogs.length"
      class="mr-2 bg-white mb-2"
      dense
      flat
      @click="onClearChat"
    >
      <img src="/img/ic-clear.svg" width="24" class="px-2p" />
      <q-tooltip>Clear chat</q-tooltip>
    </q-btn>
    <div class="flex-1 mb-1 bg-f2 bdrs-8" style="width: 200px">
      <div class="pa-2 ov-a" v-if="imgList.length">
        <div class="nowrap">
          <div class="d-flex">
            <div
              class="pos-r bd-1 bdrs-5 ov-h mr-2"
              v-for="(it, i) in imgList"
              :key="i"
            >
              <img :src="it.src" height="90px" class="d-b" />
              <div class="pos-a top-0 right-0 m-1 hover-1" @click="onDel(i)">
                <img src="/img/chat/x-circle.svg" width="18" />
              </div>
            </div>
            <div class="pr-1"></div>
          </div>
        </div>
      </div>
      <q-input
        ref="input"
        class="bg-input bdrs-8"
        outlined
        dense
        v-model="inputVal"
        autogrow
        placeholder="Chat or prompt"
        @keyup.enter="onEnter"
        @focus="isFoucs = true"
        @blur="isFoucs = false"
      >
        <template #append>
          <div
            v-if="inDev"
            class="pa-2 hover-1"
            :disable="imgList.length >= 4"
            @click="$refs.upload.click()"
          >
            <img src="/img/chat/paperclip.svg" width="20" />
            <q-tooltip :offset="[0, -10]"
              >Limit: 4 attachments per message.</q-tooltip
            >
          </div>
          <q-btn
            class="send-btn mb-1"
            round
            :color="trimVal ? 'primary' : 'info'"
            dense
            :disable="!trimVal"
            @click="onEnter"
          >
            <img
              src="/img/send.svg"
              width="20"
              class="pos-r"
              style="left: -1px"
            />
          </q-btn>
        </template>
      </q-input>
    </div>
  </div>
  <div class="pa-1 mb-2 ta-c fz-12 text-info">
    4EVERChat can make mistakes. Check important info.
  </div>
  <div class="d-n">
    <input
      ref="upload"
      type="file"
      accept="image/*"
      multiple
      @input="onUpload"
    />
  </div>
  <div class="safe-btm"></div>
</template>

<script>
import { compressImg } from "src/utils/compress";
import { mapState } from "vuex";

export default {
  data() {
    return {
      isFoucs: false,
      inputVal: "",
      composing: false,
      imgList: [],
    };
  },
  computed: {
    ...mapState({
      apiKey: (s) => s.apiKey,
      chatLogs: (s) => s.chatLogs,
      chatMenus: (s) => s.chatMenus,
      menuIdx: (s) => s.menuIdx,
    }),
    trimVal() {
      return this.inputVal.trim();
    },
    inDev() {
      return this.$inDev;
    },
  },
  watch: {
    apiKey() {
      if (this.needSend) {
        this.onEnter();
        this.needSend = false;
      }
    },
    menuIdx() {
      this.inputVal = "";
    },
  },
  mounted() {
    const input = this.$refs.input.nativeEl;
    input.addEventListener("compositionstart", () => {
      this.composing = true;
    });
    input.addEventListener("compositionend", () => {
      setTimeout(() => {
        this.composing = false;
      }, 100);
    });
    this.$bus.on("chat-focus", () => {
      this.$refs.input?.focus();
    });
  },
  methods: {
    onDel(i) {
      this.imgList.splice(i, 1);
    },
    async onUpload(e) {
      const files = e.target.files;
      for (const file of files) {
        const img = await compressImg(file);
        // console.log(img);
        const reader = new FileReader();
        reader.onload = (e) => {
          // console.log(e.target.result);
          this.imgList.push({
            src: e.target.result,
          });
        };
        reader.readAsDataURL(img);
      }
    },
    async onClearChat() {
      // This will clean up your chat history. Unless you have exported the chat, this action is irreversible. Would you like to proceed?
      const len = this.chatLogs.length;
      this.$setStore({
        chatLogs: [],
      });
      this.$store.commit("updateChatMenu", {
        title: "",
      });
      // if (!len && this.chatMenus.length > 1) {
      //   await this.$sleep(100);
      // }
    },
    onEnter(e) {
      if (e.shiftKey) {
        return;
      }
      if (this.composing) return;
      if (!this.trimVal) {
        this.inputVal = "";
        return;
      }

      // console.log(this.trimVal);
      this.sendMsg();
    },
    sendMsg() {
      this.$bus.emit("send-msg", this.trimVal);
      this.inputVal = "";
    },
  },
};
</script>
