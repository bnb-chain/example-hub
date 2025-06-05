<style lang="scss">
.msg-item-con {
  border-top-left-radius: 0;
  .bg-con {
    background: #f1f5f9;
  }
  &:hover .bg-con {
    background: #f8fafc;
  }
}
.msg-item {
  .expander {
    padding: 0 3px;
    .icon-down {
      margin-top: 4px;
      &.up-down {
        margin-top: 12px;
      }
    }
  }
  .expander:hover {
    .icon-down {
      margin-top: 12px;
      &.up-down {
        margin-top: 4px;
      }
    }
  }
}
</style>

<template>
  <div class="d-flex msg-item mb-5 hover-wrap">
    <div>
      <jazz-icon :hash="modelId" :size="26" />
    </div>
    <div class="ml-2">
      <div class="d-flex mb-1 fz-13">
        <a
          class="al-c hover-1 link"
          :href="$getHomeUrl('/ai-rpc/model/' + encodeURIComponent(modelId))"
          target="_blank"
        >
          <span v-if="modelRow">{{ modelRow.name }}</span>
          <span v-else>{{ modelId }}</span>
          <img src="/img/ic-link.svg" width="12" class="ml-2" />
        </a>
      </div>

      <div class="d-flex">
        <div class="d-flex bd-1 bdc-f8 bdrs-8 ov-h msg-item-con">
          <div class="px-3 py-2 fz-15">
            <div
              :class="{
                'line-3': !isExpand,
              }"
            >
              <md-con :content="mdCon" />
            </div>
          </div>

          <div
            class="expander al-c f-center bg-left hover-1 select-none"
            @click="isExpand = !isExpand"
          >
            <div class="h-flex ev-n">
              <img
                src="/img/ic-down.svg"
                width="10"
                class="icon-up trans-200"
                :class="{
                  'up-down': !isExpand,
                }"
              />
              <img
                src="/img/ic-down.svg"
                width="10"
                class="icon-down trans-200"
                :class="[
                  {
                    'up-down': isExpand,
                  },
                ]"
              />
            </div>
          </div>
        </div>
      </div>

      <div class="mt-1 al-c gray op-9">
        <span>~{{ tokenNum }} tokens</span>
        <q-spinner
          v-show="resMsg && streaming"
          class="ml-2"
          size="14px"
          :thickness="2"
        />
        <div class="al-c ml-2 hover-show">
          <img
            v-show="!streaming"
            src="/img/ic-refresh.svg"
            width="14"
            class="hover-1 mr-2"
            @click="onGetNew"
          />
          <img
            v-show="mdCon"
            src="/img/ic-copy.svg"
            width="14"
            class="hover-1 mr-2"
            @click="$copy(mdCon)"
          />
          <img
            src="/img/ic-delete.svg"
            width="14"
            class="hover-1 mr-2"
            @click="onDel"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { debounce } from "quasar";
import { mapGetters, mapState } from "vuex";
import mixin from "./msg-item";

export default {
  mixins: [mixin],
  props: {
    rowId: String,
    info: Object,
    modelId: String,
    logs: Array,
  },
  computed: {
    ...mapState({
      aiModels: (s) => s.aiModels,
      configKeys: (s) => s.configKeys,
      configMap: (s) => s.configMap,
      apiKey: (s) => s.apiKey,
    }),
    ...mapGetters(["chatMenu"]),
    modelRow() {
      return this.aiModels.find((it) => it.id == this.modelId);
    },
    curConfig() {
      return this.configMap[this.modelId] || this.configMap.all;
    },
    configBody() {
      if (!this.curConfig) return;
      const body = {};
      for (const key in this.curConfig) {
        const item = this.configKeys.find((it) => it.name == key);
        if (!item || !item.is_body) continue;
        const val = this.curConfig[key];
        if (item.def == val) continue;
        body[key] = val;
      }
      return body;
    },
    mdCon() {
      return this.resMsg || this.info.content;
    },
  },
  data() {
    return {
      isExpand: false,
    };
  },
  watch: {
    resMsg() {
      this.setNewContent();
    },
    isExpand() {
      this.updateLog({
        expand: this.isExpand,
      });
    },
  },
  created() {
    this.$bus.on("refresh-chat", (id) => {
      if (id == this.info.con_id) {
        this.closeAi();
        this.onGetNew();
      }
    });
    this.setNewContent = debounce(this.setContent, 300);
    this.tokenNum = this.info.tokens || 0;
    if (!this.info.content) {
      this.fetchAi();
    }
    this.isExpand = !!this.info.expand;
  },
  beforeUnmount() {
    this.closeAi();
  },
  methods: {
    onDel() {
      this.closeAi();
      this.updateLog({
        _delete: true,
      });
    },
    onGetNew() {
      this.updateLog({
        content: "",
      });
      this.fetchAi();
    },
    setContent() {
      if (!this.resMsg) return;
      // console.log(this.info.id, this.resMsg);
      this.updateLog({
        content: this.resMsg,
        duration: Date.now() - this.beginAt,
        tokens: this.tokenNum,
        expand: this.isExpand,
      });
    },
    updateLog(body) {
      this.$store.commit("updateChatLog", {
        id: this.info.id,
        ...body,
      });
    },
  },
};
</script>