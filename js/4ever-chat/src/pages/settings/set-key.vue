<template>
  <div class="mt-4 bg-left bdrs-5 pa-3">
    <div class="al-c">
      <span class="fz-16 fw-b">Set default key</span>
      <q-btn dense flat class="ml-auto bd-1" @click="$bus.emit('show-import')">
        <img src="/img/chat/import.svg" width="18" />
        <span class="ml-1">Import key</span>
      </q-btn>
    </div>
    <div>
      <div
        class="bg-fff bdrs-5 al-c pa-2 mt-4"
        v-for="it in myKeyList"
        :key="it.key"
        :class="{
          'bg-hover-1 hover-wrap': it.key != apiKey,
        }"
        @click="setKey(it.key)"
      >
        <span class="fz-16 line-1">{{ it.name }}</span>
        <span class="ml-1 op-5" v-if="it.imported">(imported)</span>
        <div
          class="ml-auto al-c shrink-0 pl-5"
          :class="{
            'hover-show': it.key != apiKey,
          }"
        >
          <template v-if="it.key == apiKey">
            <img src="/img/chat/key-checked.svg" width="18" />
            <span class="color-1 ml-1">In use</span>
          </template>
          <template v-else>
            <img src="/img/chat/switch.svg" width="18" />
            <span class="ml-1 label-0">Switch</span>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState } from "vuex";
export default {
  computed: {
    ...mapState(["keyList", "apiKey", "importKey"]),
    myKeyList() {
      const list = [...this.keyList];
      if (this.importKey) {
        const { name, value } = this.importKey;
        list.push({
          name,
          key: value,
          imported: true,
        });
      }
      return list;
    },
  },
  methods: {
    setKey(apiKey) {
      this.$setStore({
        apiKey,
      });
    },
  },
};
</script>