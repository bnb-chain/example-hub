<template>
  <qs-popup v-model="showPop" hide-close title="4EVERLAND AI RPC key">
    <div class="mt-2">
      <q-input v-model="form.name" label="Key Name" outlined dense></q-input>
      <q-input
        v-model="form.value"
        label="API Key"
        class="mt-5"
        outlined
        dense
      ></q-input>
    </div>
    <div class="al-c mt-6">
      <q-btn flat color="red" dense @click="onDel" v-if="importKey"
        >Delete</q-btn
      >
      <q-btn flat class="ml-auto" @click="showPop = false">Cancel</q-btn>
      <q-btn class="ml-3" color="primary" @click="onSave">Save</q-btn>
    </div>
  </qs-popup>

  <!-- <qs-popup></qs-popup> -->
</template>

<script>
import { mapState } from "vuex";

const initForm = {
  name: "",
  value: "",
};
export default {
  computed: {
    ...mapState({
      apiKey: (s) => s.apiKey,
      importKey: (s) => s.importKey,
    }),
  },
  data() {
    return {
      showPop: false,
      form: {
        ...initForm,
      },
    };
  },
  watch: {
    showPop(val) {
      if (val) {
        this.form = this.importKey
          ? { ...this.importKey }
          : {
              ...initForm,
            };
      }
    },
  },
  created() {
    this.$bus.on("show-import", () => {
      this.showPop = true;
    });
  },
  methods: {
    onDel() {
      const apiKey = this.apiKey == this.importKey.value ? "" : this.apiKey;
      this.$setStore({
        importKey: null,
        apiKey,
      });
      this.showPop = false;
    },
    onSave() {
      let msg = "";
      const { name, value } = this.form;
      if (!name) msg = "Key name is required";
      else if (!value) msg = "API Key is required";
      else if (!/^\w{32}$/.test(value)) msg = "Invalid API Key";
      if (msg) {
        return window.$toast(msg);
      }
      this.$setStore({
        apiKey: value,
        importKey: { ...this.form },
      });
      this.showPop = false;
    },
  },
};
</script>