[**@vtherm/dashboard-sdk**](../index.md)

***

# testing

A fake dashboard to test a plugin without Home Assistant.

Import it from `@vtherm/dashboard-sdk/testing`, in the tests only. It applies the same validation and the same
resolution of the positions as the dashboard, because it uses the same code, so a plugin that behaves well here behaves the
same in the dashboard. The main entry point of the SDK never imports this module, so it is not part of the bundle of a plugin.

## Interfaces

- [FakeHass](interfaces/FakeHass.md)
- [FakeHassOptions](interfaces/FakeHassOptions.md)
- [FakeHost](interfaces/FakeHost.md)
- [FakeHostOptions](interfaces/FakeHostOptions.md)
- [ServiceCall](interfaces/ServiceCall.md)
- [TranslationProblems](interfaces/TranslationProblems.md)

## Functions

- [assertCompleteTranslations](functions/assertCompleteTranslations.md)
- [createFakeHass](functions/createFakeHass.md)
- [createFakeHost](functions/createFakeHost.md)
- [findTranslationProblems](functions/findTranslationProblems.md)
