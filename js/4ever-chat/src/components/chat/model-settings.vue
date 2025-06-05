<template>
  <div class="h-flex h100p no-bd" v-if="curItem">
    <div class="pa-3 bg-pink0">
      <div class="al-c">
        <jazz-icon hash="test" :size="30"></jazz-icon>
        <span class="fz-15 ml-2">{{ curItem.name }}</span>

        <div class="ml-auto pr-2- bg-white- bdrs-6 al-c">
          <!-- <q-toggle v-model="checked" size="xs" /> -->
          <q-btn dense flat @click="onBack">
            <q-icon name="close" size="22px"></q-icon>
          </q-btn>
        </div>
      </div>
    </div>

    <q-scroll-area
      class="flex-1"
      :thumb-style="{
        right: '2px',
        width: '3px',
        opacity: 0.35,
      }"
    >
      <div class="pa-4">
        <div class="mb-" v-for="it in configKeys" :key="it.name">
          <div class="mb-2" v-if="!it.max">
            <div class="label-1">{{ it.label }}</div>
            <q-input
              v-model="curForm[it.name]"
              outlined
              bg-color="white"
              dense
              autogrow
              maxlength="1500"
              @keyup="setConfig"
            ></q-input>
          </div>

          <div v-else class="al-c">
            <div class="flex-1">
              <div class="al-c label-1">
                <span class="mr-">{{ it.label }}</span>
                <q-btn icon="info_outline" flat size="xs" dense>
                  <q-tooltip
                    max-width="300px"
                    class="fz-14"
                    self="top left"
                    :offset="[0, 0]"
                  >
                    <div class="">{{ it.tip }}</div>
                  </q-tooltip>
                </q-btn>
              </div>
              <q-slider
                v-model="curForm[it.name]"
                :min="it.min"
                :max="it.max"
                :step="it.step || 1"
                :name="it.name"
                dense
                track-size="4px"
                thumb-size="14px"
                thumb-color="white"
                inner-track-color="white"
                color="info"
                @update:model-value="onSlide(it, $event)"
              />
            </div>
            <q-input
              v-model="inpForm[it.name]"
              class="ml-3 tiny-input ta-r"
              bg-color="white"
              outlined
              dense
              style="width: 80px"
              @update:model-value="onInput(it, $event)"
              @blur="onBlur(it)"
            />
          </div>
        </div>

        <div class="al-c mt-4">
          <q-btn
            flat
            class="bg-white flex-1"
            :disable="isAll"
            @click="applyToAll"
          >
            <span class="fz-13">{{ isAll ? "Applied" : "Apply" }} to All</span>
          </q-btn>
          <q-btn
            flat
            class="bg-white flex-1 ml-3"
            :disable="!isChange"
            @click="onReset"
          >
            <span class="fz-13">Reset</span>
          </q-btn>
        </div>
        <div class="mt-4">
          <q-btn color="red" flat class="w100p bg-white" @click="onRemove">
            Remove
          </q-btn>
        </div>
      </div>
    </q-scroll-area>
  </div>
</template>

<script>
import { mapGetters, mapState } from "vuex";

export default {
  computed: {
    ...mapState({
      configKeys: (s) => s.configKeys,
      configMap: (s) => s.configMap,
      aiModels: (s) => s.aiModels,
      configModelId: (s) => s.configModelId,
    }),
    ...mapGetters(["chatMenu"]),
    curItem() {
      return this.aiModels.find((it) => it.id == this.configModelId);
    },
    isChange() {
      let change = false;
      for (const key in this.initForm) {
        if (this.initForm[key] != this.curForm[key]) {
          change = true;
          break;
        }
      }
      return change;
    },
    modelConfig() {
      return this.configMap[this.configModelId] || this.configMap.all;
    },
    isAll() {
      const { all } = this.configMap;
      if (!all) return false;
      if (Object.keys(this.configMap).length > 1) return false;
      for (const key in all) {
        if (all[key] != this.curForm[key]) return false;
      }
      return true;
    },
  },
  data() {
    return {
      checked: false,
      standard: 10,
      val: "10",
      initForm: {},
      curForm: {},
      inpForm: {},
    };
  },
  watch: {
    "chatMenu.id"() {
      this.onBack();
    },
    configModelId(val) {
      if (val) this.onInit();
    },
    configMap(val) {
      this.$store.commit("updateChatMenu", {
        modelConfig: val,
      });
    },
  },
  created() {
    const initForm = {};
    for (const it of this.configKeys) {
      initForm[it.name] = it.def;
    }
    this.initForm = initForm;
    this.onInit();
  },
  methods: {
    onInit() {
      if (this.modelConfig && this.modelConfig.top_a === undefined) {
        this.onReset();
        console.log("auto_reset");
      } else {
        this.onSetForm(this.modelConfig || this.initForm);
      }
    },
    applyToAll() {
      this.$setState({
        configMap: {
          all: {
            ...this.curForm,
          },
        },
      });
    },
    onReset() {
      this.onSetForm(this.initForm);
      this.setConfig();
    },
    onSetForm(form) {
      this.curForm = { ...form };
      this.inpForm = { ...form };
    },
    onBlur(it) {
      if (this.inpForm[it.name] === "") {
        this.inpForm[it.name] = it.def;
      }
    },
    onInput(it, val) {
      const { name, min, max, def } = it;
      let fval = val;
      if (val === "") {
        return;
      }
      if (isNaN(val)) {
        fval = "";
      } else if (val > max) {
        fval = max;
      } else if (val < min) {
        fval = min;
      }
      if (fval === val) {
        this.curForm[name] = val;
      } else {
        this.inpForm[name] = fval;
        this.curForm[name] = val;
      }
      // console.log(name, val, fval);
      this.setConfig();
    },
    onSlide(it, e) {
      this.inpForm[it.name] = e;
      this.setConfig();
    },
    setConfig() {
      const configMap = {
        ...this.configMap,
        [this.configModelId]: { ...this.curForm },
      };
      // console.log(configMap);
      this.$setState({ configMap });
    },
    onBack() {
      this.$setState({
        configModelId: null,
      });
    },
    onRemove() {
      this.$bus.emit("select-model", this.configModelId);
      this.onBack();
    },
  },
};
</script>